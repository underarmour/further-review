import fallbackConfig from '../config';
import fallbackLog from '../log';

class BaseProvider {
  constructor(options = {}) {
    // Not yet supported in babel?
    // if (new.target === ReviewProvider) {
    //   throw new TypeError('Cannot construct ReviewProvider instances directly');
    // }

    const {
      config = fallbackConfig,
      log = fallbackLog,
      github,
      ...additionalOptions
    } = options;

    this.options = additionalOptions;

    this.globalConfig = config;
    this.log = log;
    this.github = github;
  }

  /**
  * Initialize the provider.
  * @param {PullRequest} - Metadata about the PR to review
  * @returns {Promise}
  */
  async init(pr) {
    this.pr = pr;
    this.self = await this.github.getCurrentUser();
  }

  /**
  * Get a vconfig alue from either provider specific config or global defaults.
  * @param {string} - keys for which to look up values.
  * @returns {Object|Array} - If only a single key was passed,
  * that value is returned, otherwise an array of values
  */
  config(...keys) {
    const configSources = [
      this.options,
      this.globalConfig && this.globalConfig('review:defaults'),
    ].filter(s => s);

    const values = keys.map(k => configSources.filter(s => k in s && s[k])[0][k]);

    if (keys.length === 1) { return values[0]; }

    return values;
  }

  /**
 * @typedef {Object} ReviewResult
 * @property {boolean} success - The review satisfied all criteria
 * @property {number} comment - (Optional) Markdown to append to a comment
 */

  /**
  * Review PR and report success, optionally provide a comment for the PR.
  * @returns {Promise<ReviewResult>}
  */
  async review() {
    throw new TypeError('review is not yet implemented!');
  }
}

export {
  BaseProvider as default,
};
