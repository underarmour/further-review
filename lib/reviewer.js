import fallbackConfig from './config';
import fallbackLog from './log';
import installedProviders from './providers';
import { dedent } from './common';

class Reviewer {
  constructor({
    github,
    log: overrideLog = fallbackLog,
    providers = installedProviders,
    config = fallbackConfig,
  } = {}) {
    this.config = config;
    this.github = github;
    this.log = overrideLog;
    this.providers = providers;
  }

  getCommentState(body) {
    const match = body.match(/\s*<!--\s+further-review:(.+)\s+-->/m);

    if (match) {
      const [, json] = match;
      try {
        return JSON.parse(json);
      } catch (err) {
        this.log.warn('Unable to parse comment state');
        this.log.warn(err);
      }
    }

    return null;
  }

  renderCommentState(state) {
    return `<!--\nfurther-review: ${JSON.stringify(state)}\n-->`;
  }

  updateStatus({ owner, repo, sha }, state, description) {
    return this.github.createStatus({
      owner,
      repo,
      sha,
      state,
      description,
      targetUrl: null,
      context: 'Further Review',
    });
  }

  async createProvider(name) {
    const providerType = this.providers[name];
    let providerConfig = this.config(`review:${name}`);

    if (providerConfig) {
      let overrideConfig = {};

      if (providerConfig !== null && typeof providerConfig === 'object') {
        overrideConfig = providerConfig;
      }
      providerConfig = Object.assign(
        {
          log: this.log,
          github: this.github,
          config: this.config,
        },
        overrideConfig
      );

      this.log.info(`Instantiating provider ${name}`);

      // eslint-disable-next-line new-cap
      const instance = new providerType(providerConfig);

      return { name, instance };
    }

    this.log.info(`Provider ${name} disabled`);
    return null;
  }

  async runCreateProviders() {
    const providers = [];

    for (const name of Object.keys(this.providers)) {
      const p = await this.createProvider(name);
      if (p) {
        providers.push(p);
      }
    }

    return providers;
  }

  createProviders() {
    // singleton promise
    if (!this.createProvidersPromise) {
      this.createProvidersPromise = this.runCreateProviders();
    }

    return this.createProvidersPromise;
  }

  renderComment(results, state) {
    const stateMd = this.renderCommentState(state);

    return dedent`${stateMd}
      ## Further Review Needed

      ${results.map(({ comment }) => comment).join('')}

      ${this.config('comment:footer') || ''}
    `;
  }

  async normalizePr({ owner, repo, number }) {
    this.log.info(`Processing ${owner}/${repo} PR #${number}`);

    const { state, head: { sha } = {}, user: { login: proposer } = {} }
      = await this.github.getPullRequest({ owner, repo, number });

    // TODO: add files to this? singleton files promise?

    return { state, owner, repo, number, sha, proposer };
  }

  async review(rawPr) {
    let pr = rawPr;

    try {
      const { login: self } = await this.github.getCurrentUser();

      pr = await this.normalizePr(pr);

      if (pr.state !== 'open') {
        this.log.warn(`${pr.owner}/${pr.repo} PR #${pr.number} is not open for processing.`);
        return pr;
      }

      await this.updateStatus(pr, 'pending', 'Processing PR');

      const previousComments = (await this.github.getIssueComments({
        owner: pr.owner,
        repo: pr.repo,
        number: pr.number,
      }))
      .filter(({ user: { login } }) => login === self)
      .map(c => {
        const { id, body } = c;
        return {
          id,
          body: body.trim(),
          state: this.getCommentState(body),
        };
      });

      this.log.debug(`Previous comments: ${previousComments.length}`);

      const shaComments = previousComments
        .filter(({ state: { sha } }) => sha === pr.sha);

      // TODO: pick most recent or is last enough?
      const previousComment = [...shaComments].pop();

      const providers = await this.createProviders();

      if (providers.length === 0) {
        this.log.warn('No providers run.');
        return pr;
      }

      Promise.all(providers.map(async ({ instance }) => instance.init(pr)));

      const results = [];

      for (const { name, instance } of providers) {
        this.log.info(`Running provider ${name}`);
        results.push(Object.assign({ name }, await instance.review(pr)));
      }

      const newState = {
        sha: pr.sha,
        providers: providers.map(({ name }) => name),
      };

      const newBody = this.renderComment(results, newState).trim();

      if (previousComment
        && newBody === previousComment.body) {
        this.log.info('No change in PR review state, comment matches');
      } else {
        await this.github.createComment({
          owner: pr.owner,
          repo: pr.repo,
          number: pr.number,
          body: newBody,
        });

        for (const { id } of previousComments) {
          await this.github.deleteComment({
            owner: pr.owner,
            repo: pr.repo,
            number: pr.number,
            id,
          });
        }
      }

      const success = results.every(r => r.success);

      if (success) {
        await this.updateStatus(pr, 'success', 'Ready to merge!');

        return pr;
      }

      // TODO: mark as pending instead of failure? config var?
      await this.updateStatus(pr, 'failure', 'Further review needed');
    } catch (err) {
      this.log.error(err);

      try {
        await this.updateStatus(pr, 'error', `Error; ${err.toString()}`);
      } catch (_) {
        // ignore status error and throw original
      }

      throw err;
    }

    return pr;
  }
}

export {
  Reviewer as default,
};
