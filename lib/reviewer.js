import Promise from 'bluebird';
import minimatch from 'minimatch';

import defaultConfig from './config';
import defaultLog from './log';
import installedProviders from './providers';

function arrayDifference(arr1, arr2) {
  return arr1.filter(x => arr2.indexOf(x) < 0);
}

function cleanLogins(arr) {
  // Same regex as inside getMentions, otherwise can get infinite loop
  const valid = arr.filter(l => l.match(/^[a-z0-9][a-z0-9\-]*$/i));

  // unique and sort
  return [...new Set(valid)].sort();
}

function isGlobMatch(files, glob) {
  return files.some(f => minimatch(f, glob));
}

function getPullRequestFiles({ github, owner, repo, number }) {
  return github.getPullRequestFiles({
    owner, repo, number,
  })
  .map(f => f.filename);
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
    log: overrideLog = defaultLog,
    providers = installedProviders,
    config = defaultConfig,
  }) {
    this.config = config;
    this.github = github;
    this.log = overrideLog;
    this.providers = providers;
  }

  getSignOffs({ owner, repo, number }) {
    const signOffRegex = new RegExp(
      this.config('signoff_regex'),
      this.config('signoff_regex_options')
    );

    return Promise.join(
      this.github.getCurrentUser(),
      this.github.getIssueComments({ owner, repo, number }),
      (self, comments) => comments.filter(c => c.body.match(signOffRegex))
        .map(c => c.user.login.toLowerCase())
        .filter(l => l !== self.login))
    .then(logins => cleanLogins(logins));
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

  initProviders() {
    if (!this.initProvidersPromise) {
      this.initProvidersPromise = Promise.resolve(Object.keys(this.providers))
        .map(name => {
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
            return Promise.resolve({ name, instance: new providerType(providerConfig) })
              .tap(({ instance }) => instance.init());
          }

          this.log.info(`Provider ${name} disabled`);
          return null;
        })
        .filter(p => p);
    }

    return this.initProvidersPromise;
  }

  getReviews({ owner, repo, sha, files }) {
    return this.initProviders()
      .map(({ name, instance }) => {
        this.log.info(`Running provider ${name}`);
        return instance.getReviews(owner, repo, sha);
      })
      .reduce((acc, src) => acc.concat(src || []), [])
      .filter(r => r && r.logins && r.logins.length > 0)
      .filter(r => !r.glob || isGlobMatch(files, r.glob))
      .then(reviews => reviews || [])
      .each(r => {
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
      })
      // double check there are logins left after cleaning
      .filter(r => r.logins.length > 0);
  }

  writeComment({ owner, repo, number, reviews, state }) {
    if (reviews.length === 0) return undefined;

    const reviewsMd = reviews.map(r => {
      const mentionMd = r.logins
        .map(l => `* @${l}`)
        .join('\n');

      return `### ${r.name}\n${r.description ? `${r.description}\n` : ''}${mentionMd}\n\n`;
    });

    // eslint-disable-next-line max-len
    const body = `<!--\nfurther-review: ${JSON.stringify(state)}\n-->\n## Further Review Needed\n\n${reviewsMd.join('')}\n${this.config('comment:footer') || ''}`;

    return this.github.createComment({ owner, repo, number, body });
  }

  processReviews({ owner, repo, sha, number }) {
    this.log.info(`Processing ${owner}/${repo} PR #${number}`);

    return this.updateStatus({
      owner,
      repo,
      sha,
      state: 'pending',
      description: 'Processing PR',
    })
    .then(() => getPullRequestFiles({ github: this.github, owner, repo, number }))
    .then(files => {
      return {
        signOffs: this.getSignOffs({ github: this.github, owner, repo, number }),
        reviews: this.getReviews({
          owner, repo, sha, files,
        }),
      };
    })
    .props()
    .then(({ reviews, signOffs }) => {
      reviews.forEach(r => {
        r.signOffs = r.logins.filter(l => signOffs.includes(l));
        r.approved = r.signOffs.length >= r.required;
        r.needed = r.logins.filter(l => !signOffs.includes(l));
      });

      return reviews;
    })
    .tap(reviews => {
      const newState = {
        sha,
        reviews: reviews.map(r => r.id),
      };

      return Promise.join(
        this.github.getCurrentUser(),
        this.github.getIssueComments({ owner, repo, number }),
        ({ login: self }, comments) => comments
          .filter(({ user: { login } }) => login === self)
      )
      .then(previousComments => {
        const [previousState] = previousComments
          .map(({ body }) => getCommentState(body))
          .filter(s => s && s.sha === sha);

        if (previousState
          && arrayDifference(newState.reviews, previousState.reviews).length === 0) {
          // Nothing new to notify about, exit
          return undefined;
        }

        return this.writeComment({ owner, repo, number, reviews, state: newState })
          .tap(() => {
            return Promise.resolve(previousComments)
              .each(({ id }) => this.github.deleteComment({ owner, repo, number, id }));
          });
      });
    })
    .then(reviews => {
      const unapproved = reviews.filter(r => !r.approved);
      if (reviews.length === 0 || unapproved.length === 0) {
        return this.updateStatus({
          owner,
          repo,
          sha,
          state: 'success',
          description: 'Ready to merge!',
        });
      }

      return this.updateStatus({
        owner,
        repo,
        sha,
        state: 'failure',
        description: 'Further review needed',
      });
    })
    .catch(e => {
      this.log.error(e);

      return Promise.reject(e)
        // set the status to error, but ignore errors from updateStatus
        .finally(() => this.updateStatus({
          owner,
          repo,
          sha,
          state: 'error',
          description: `Error: ${e.toString()}`,
        }).catchReturn());
    });
  }
}

export {
  Reviewer as default,
  isGlobMatch,
  cleanLogins,
  getCommentState,
  arrayDifference,
};
