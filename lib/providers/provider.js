import defaultLog from '../log';

class ReviewProvider {
  constructor(config = {}) {
    // Not yet supported in babel?
    // if (new.target === ReviewProvider) {
    //   throw new TypeError('Cannot construct GithubProvider instances directly');
    // }

    const { log = defaultLog } = config;

    this.config = config;
    this.log = log;

    delete config.log;
  }

  async init() {
    return this;
  }

  async getReviews(_owner, _repo, _sha) {
    throw new TypeError('getReviews is not yet implemented!');
  }
}

export {
  ReviewProvider as default,
};
