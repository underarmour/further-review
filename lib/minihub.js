import axios from 'axios';

import fallbackConfig from './config';
import fallbackLog from './log';
import { url } from './common';

const DEFAULT_ACCEPT = 'application/vnd.github.v3+json';
const DIFF_ACCEPT = 'application/vnd.github.diff';

class NotFoundError extends Error {
  constructor(inner) {
    super();
    this.inner = inner;
    this.name = 'NotFoundError';
    Error.captureStackTrace(this, NotFoundError);
  }
}

class MiniHub {
  constructor({
    log: overrideLog = fallbackLog,
    config = fallbackConfig,
  } = {}) {
    this.config = config;
    this.log = overrideLog;

    const token = this.config('github:token');
    const baseUrl = this.baseUrl = this.config('github:base_url');

    this.axios = axios.create({ baseURL: baseUrl });

    Object.assign(this.axios.defaults.headers.common, {
      'User-Agent': 'Further Review',
      Authorization: `token ${token}`,
      Accept: DEFAULT_ACCEPT,
    });
  }

  async handleLinkHeader(requestOptions, response) {
    // TODO: do link processing not recursively?
    if (Array.isArray(response.data)) {
      const linkHeader = response.headers.Link;

      if (linkHeader) {
        const links = {};

        linkHeader.replace(/<([^>]*)>;\s*rel="([\w]*)"/g, (m, uri, type) => {
          links[type] = uri;
        });

        if (links.next) {
          const cloneOpts = JSON.parse(JSON.stringify(requestOptions));
          cloneOpts.url = links.next;

          const nextData = await this.request(cloneOpts);
          response.data = response.data.concat(nextData);
        }
      }
    }

    return response;
  }

  async request(opts) {
    this.log.info(`Requesting ${opts.url}`);

    let response;

    try {
      response = await this.axios.request(opts);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        throw new NotFoundError(err);
      }

      throw err;
    }

    response = await this.handleLinkHeader(opts, response);
    return response.data;
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
};
