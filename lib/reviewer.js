import Promise from 'bluebird';
import minimatch from 'minimatch';

import defaultConfig from './config';
import defaultLog from './log';
import installedProviders from './providers';

function cleanLogins(arr) {
  // unique and sort
  return [...new Set(arr)].sort();
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

function getMentions({ github, owner, repo, number }) {
  return github.getCurrentUser()
    .get('login')
    .then(login => github.getIssueComments({
      owner, repo, number,
    })
    .filter(c => c.user.login === login))
    .map(c => {
      const logins = c.body.match(/@[a-z0-9][a-z0-9\-]*\b/gim) || [];

      return logins.map(l => l.substring(1).toLowerCase());
    })
    .reduce((acc, arr) => acc.concat(arr), [])
    .then(logins => cleanLogins(logins));
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
      owner, repo, sha, state, description,
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
        // normalize review entries
        r.logins = [...new Set(r.logins)].sort();
        r.required = r.required || 1;
      });
  }

  processReviews({ owner, repo, sha, number }) {
    this.log.info(`Processing ${owner}/${repo} PR #${number}`);

    return this.updateStatus({
      owner, repo, sha,
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
      return getMentions({ github: this.github, owner, repo, number })
        .then(existingMentions => reviews
          .map(r => {
            const newMentions = r.needed
              .filter(l => !existingMentions.includes(l))
              .sort();

            return { review: r, newMentions };
          })
        )
        .filter(r => r.newMentions.length > 0)
        .map(r => {
          const mentionMd = r.newMentions
            .map(l => `* @${l}`)
            .join('\n');

          return `### ${r.review.name}\n\n${mentionMd}\n\n`;
        })
        .then(reviewsMd => {
          if (reviewsMd.length > 0) {
            const body = `## Further Review Needed\n\n${reviewsMd.join('')}`;

            return this.github.createComment({ owner, repo, number, body });
          }

          return undefined;
        });
    })
    .then(reviews => {
      const unapproved = reviews.filter(r => !r.approved);
      if (reviews.length === 0 || unapproved.length === 0) {
        return this.updateStatus({
          owner, repo, sha,
          state: 'success',
          description: 'Ready to merge!',
        });
      }

      return this.updateStatus({
        owner, repo, sha,
        state: 'failure',
        description: 'Further review needed',
      });
    })
    .catch(e => {
      this.log.error(e);

      return Promise.reject(e)
        // set the status to error, but ignore errors from updateStatus
        .finally(() => this.updateStatus({
          owner, repo, sha,
          state: 'error',
          description: `Error: ${e.toString()}`,
        }).catchReturn());
    });
  }
}

export {
  Reviewer as default,
  getMentions,
  isGlobMatch,
};
