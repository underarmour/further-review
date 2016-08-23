import fallbackConfig from './config';
import fallbackLog from './log';
import installedProviders from './providers';
import { unique, arrayDifference, isGlobMatch } from './common';

function cleanLogins(arr) {
  // Same regex as inside getMentions, otherwise can get infinite loop
  const valid = arr.filter(l => l.match(/^[a-z0-9][a-z0-9\-]*$/i));

  return unique(valid).sort();
}

async function getPullRequestFiles({ github, owner, repo, number }) {
  const files = await github.getPullRequestFiles({
    owner, repo, number,
  });

  return files.map(f => f.filename);
}

function getCommentState(body) {
  const match = body.match(/\s*<!--\s+further-review:(.+)\s+-->/m);

  if (match) {
    const [, json] = match;
    return JSON.parse(json);
  }

  return null;
}

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

  async getSignOffs({ owner, repo, number }) {
    const signOffRegex = new RegExp(
      this.config('signoff_regex'),
      this.config('signoff_regex_options')
    );

    const self = await this.github.getCurrentUser();
    const comments = await this.github.getIssueComments({ owner, repo, number });

    const logins = comments.filter(c => c.body.match(signOffRegex))
      .map(c => c.user.login.toLowerCase())
      .filter(l => l !== self.login);

    return cleanLogins(logins);
  }

  updateStatus({ owner, repo, sha, state, description }) {
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

      await instance.init();

      return { name, instance };
    }

    this.log.info(`Provider ${name} disabled`);
    return null;
  }

  async runInitProviders() {
    const providers = [];

    for (const name of Object.keys(this.providers)) {
      const p = await this.createProvider(name);
      if (p) {
        providers.push(p);
      }
    }

    return providers;
  }

  initProviders() {
    // singleton promise
    if (!this.initProvidersPromise) {
      this.initProvidersPromise = this.runInitProviders();
    }

    return this.initProvidersPromise;
  }

  async getReviews({ owner, repo, sha, files }) {
    const providers = await this.initProviders();

    let reviews = [];

    for (const { name, instance } of providers) {
      this.log.info(`Running provider ${name}`);
      reviews.push(...await instance.getReviews(owner, repo, sha));
    }

    reviews = reviews
      .filter(r => r && r.logins && r.logins.length > 0)
      .filter(r => !r.glob || isGlobMatch(files, r.glob));

    for (const r of reviews) {
      const originalLogins = r.logins;
      r.logins = cleanLogins(r.logins);

      if (originalLogins.length !== r.logins.length) {
        this.log.warn(`Invalid / duplicate logins in ${r.name}`);

        const invalidLogins = arrayDifference(originalLogins, r.logins);

        if (invalidLogins.length > 0) {
          this.log.warn(`Invalid logins: ${invalidLogins.length}`);
        }
      }

      r.required = r.required || 1;
    }

    // double check there are logins left after cleaning
    return reviews.filter(r => r.logins.length > 0);
  }

  writeComment({ owner, repo, number, reviews, state }) {
    if (reviews.length === 0) return undefined;

    const reviewsMd = reviews.map(r => {
      const mentionMd = r.logins
        .map(l => `* @${l}`)
        .join('\n');

      const descriptionMd = r.description ? `${r.description}` : '';

      let requiredMd = '';

      if (r.logins.length > 1 && r.required >= 1) {
        requiredMd = `**${r.required}** sign-off${r.required > 1 ? 's' : ''} required`;
      }

      return `### ${r.name}\n${descriptionMd}\n\n${mentionMd}\n\n${requiredMd}\n\n`;
    });

    // eslint-disable-next-line max-len
    const body = `<!--\nfurther-review: ${JSON.stringify(state)}\n-->\n## Further Review Needed\n\n${reviewsMd.join('')}\n${this.config('comment:footer') || ''}`;

    return this.github.createComment({ owner, repo, number, body });
  }

  async processReviews({ owner, repo, number }) {
    let sha;
    let proposer;

    try {
      this.log.info(`Processing ${owner}/${repo} PR #${number}`);

      ({ head: { sha }, user: { login: proposer } }
        = await this.github.getPullRequest({ owner, repo, number }));

      await this.updateStatus(Object.assign(
        { owner, repo, number, sha, proposer },
        { state: 'pending', description: 'Processing PR' },
      ));

      const files = await getPullRequestFiles({ github: this.github, owner, repo, number });
      const signOffs = await this.getSignOffs({ owner, repo, number });
      const reviews = await this.getReviews({ owner, repo, sha, files });

      this.log.debug(`Sign-offs: ${signOffs.join(',')}`);

      reviews.forEach(r => {
        if (r.logins.includes(proposer)) {
          // probably should just make logins a Set
          r.logins = arrayDifference(r.logins, [proposer]);
          if (r.required > 0) {
            // semi-complex logic here.  the thought is that if someone
            // has set required > 0, then they want eyes on the PR, so
            // try to keep at least 1 required unless the logins length
            // is zero.
            r.required = Math.max(1, r.required - 1);
          }
        }

        // ensure not more required than there are possible sign offs
        r.required = Math.min(r.logins.length, r.required);
        r.signOffs = r.logins.filter(l => signOffs.includes(l));
        r.approved = r.signOffs.length >= r.required;
        r.needed = r.logins.filter(l => !signOffs.includes(l));
      });

      const newState = {
        sha,
        reviews: reviews.map(r => r.id),
      };

      const { login: self } = await this.github.getCurrentUser();

      const previousComments = (await this.github.getIssueComments({ owner, repo, number }))
        .filter(({ user: { login } }) => login === self);

      this.log.debug(`Previous comments: ${previousComments.length}`);

      const [previousState] = previousComments
        .map(({ body }) => getCommentState(body))
        .filter(s => s && s.sha === sha);

      if (previousState
        && arrayDifference(newState.reviews, previousState.reviews).length === 0) {
        this.log.info('No change in PR review state');
      } else {
        await this.writeComment({ owner, repo, number, reviews, state: newState });

        for (const { id } of previousComments) {
          await this.github.deleteComment({ owner, repo, number, id });
        }
      }

      const unapproved = reviews.filter(r => !r.approved);

      this.log.debug(`Unapproved count: ${unapproved.length}`);

      if (reviews.length === 0 || unapproved.length === 0) {
        await this.updateStatus({
          owner,
          repo,
          sha,
          state: 'success',
          description: 'Ready to merge!',
        });

        return { owner, repo, number, sha, proposer };
      }

      await this.updateStatus({
        owner,
        repo,
        sha,
        state: 'failure',
        description: 'Further review needed',
      });
    } catch (err) {
      this.log.error(err);

      try {
        await this.updateStatus({
          owner,
          repo,
          sha,
          state: 'error',
          description: `Error; ${err.toString()}`,
        });
      } catch (_) {
        // ignore status error and throw original
      }

      throw err;
    }

    return { owner, repo, number, sha, proposer };
  }
}

export {
  Reviewer as default,
  cleanLogins,
  getCommentState,
};
