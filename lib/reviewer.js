import Promise from 'bluebird';

import log from './log';
import getReviews from './reviews';

function unique(arr) {
  return Array.from(new Set(arr));
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
      const logins = c.body_text.match(/@[a-z0-9][a-z0-9\-]*\b/gim) || [];

      return logins.map(l => l.substring(1).toLowerCase());
    })
    .reduce((acc, arr) => acc.concat(arr), [])
    .then(logins => unique(logins).sort());
}

function getSignOffs({ github, owner, repo, number }) {
  return Promise.join(
    github.getCurrentUser(),
    github.getIssueComments({ owner, repo, number }),
    (self, comments) => comments.filter(c => c.body_text.match(/\bLGTM\b/i))
      .map(c => c.user.login.toLowerCase())
      .filter(l => l !== self.login))
  .then(logins => unique(logins).sort());
}

class Reviewer {
  constructor({ github }) {
    this.github = github;
  }

  updateStatus({ owner, repo, sha, state, description }) {
    return this.github.createStatus({
      owner, repo, sha, state, description,
      targetUrl: null,
      context: 'Further Review',
    });
  }

  processReviews({ owner, repo, sha, number }) {
    log.info(`Processing ${owner}/${repo} PR #${number}`);

    return this.updateStatus({
      owner, repo, sha,
      state: 'pending',
      description: 'Processing PR',
    })
    .then(() => getPullRequestFiles({ github: this.github, owner, repo, number }))
    .then(files => {
      return {
        signOffs: getSignOffs({ github: this.github, owner, repo, number }),
        reviews: getReviews({
          github: this.github, dataLayer: this.dataLayer,
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
      log.error(e);

      return this.updateStatus({
        owner, repo, sha,
        state: 'error',
        description: `Error: ${e.toString()}`,
      })
      // always return the original error
      .then(() => e, () => e);
    });
  }
}

export {
  Reviewer as default,
  getMentions,
  getSignOffs,
};
