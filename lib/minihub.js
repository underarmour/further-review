import axios from 'axios';
import Promise from 'bluebird';

import config from './config';
import log from './log';

const DEFAULT_ACCEPT = 'application/vnd.github.v3+json';
const DIFF_ACCEPT = 'application/vnd.github.diff';

const isNotFoundError = (e => e.response.status === 404);

function url(strings, ...values) {
  return strings
    .reduce((result, s, i) => result
      .concat(s, values[i] == null ? '' : encodeURIComponent(values[i])), [])
    .join('');
}

class NotFoundError extends Error {
  constructor(inner) {
    super();
    this.inner = inner;
    this.name = 'NotFoundError';
    Error.captureStackTrace(this, NotFoundError);
  }
}

class MiniHub {
  constructor() {
    const token = config('github:token');
    const baseUrl = this.baseUrl = config('github:base_url');

    this.axios = axios.create({ baseURL: baseUrl });

    Object.assign(this.headers, {
      'User-Agent': 'Further Review',
      Authorization: `token ${token}`,
      Accept: DEFAULT_ACCEPT,
    });
  }

  get headers() {
    return this.axios.defaults.headers.common;
  }

  request(opts) {
    log.info(`Requesting ${opts.url}`);

    const handleLinkHeader = (resp) => {
      // TODO: do link processing not recursively?
      if (Array.isArray(resp.data)) {
        const linkHeader = resp.headers.Link;

        if (linkHeader) {
          const links = {};

          linkHeader.replace(/<([^>]*)>;\s*rel="([\w]*)"/g, (m, uri, type) => {
            links[type] = uri;
          });

          if (links.next) {
            const cloneOpts = JSON.parse(JSON.stringify(opts));
            cloneOpts.url = links.next;

            return this.request(cloneOpts)
            .then(nextResp => {
              nextResp.data = resp.data.concat(nextResp.data);
              return nextResp;
            });
          }
        }
      }

      return resp;
    };

    return Promise.resolve(this.axios.request(opts))
      .catch(isNotFoundError, e => {
        throw new NotFoundError(e);
      })
      .then(handleLinkHeader)
      .then(resp => resp.data);
  }

  createStatus({ owner, repo, sha, state, targetUrl = null, description = null, context = null }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/statuses/${sha}`,
      method: 'post',
      data: {
        state,
        description,
        context,
        target_url: targetUrl,
      },
    });
  }

  getContents({ owner, repo, path, ref = null }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/contents/${path}`,
      method: 'get',
      params: { ref },
    });
  }

  getPullRequest({ owner, repo, number }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/pulls/${number}`,
      method: 'get',
    });
  }

  getPullRequestFiles({ owner, repo, number }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/pulls/${number}/files`,
      method: 'get',
    });
  }

  getPullRequestDiff({ owner, repo, number }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/pulls/${number}`,
      method: 'get',
      headers: {
        Accept: DIFF_ACCEPT,
      },
    });
  }

  getIssueComments({ owner, repo, number }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/issues/${number}/comments`,
      method: 'get',
    });
  }

  createComment({ owner, repo, number, body }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/issues/${number}/comments`,
      method: 'post',
      data: { body },
    });
  }

  deleteComment({ owner, repo, id }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/issues/comments/${id}`,
      method: 'delete',
    });
  }

  getCollaborators({ owner, repo }) {
    return this.request({
      url: url`/repos/${owner}/${repo}/collaborators`,
      method: 'get',
    });
  }

  getCurrentUser() {
    // cache this result since it doesn't change unless the token changes
    if (!this.currentUserPromise) {
      this.currentUserPromise = this.request({
        url: url`/user`,
        method: 'get',
      });
    }

    return this.currentUserPromise;
  }
}

const DefaultMiniHub = new MiniHub();

export {
  DefaultMiniHub as default,
  NotFoundError,
  MiniHub,
  url,
};
