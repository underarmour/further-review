import Promise from 'bluebird';

import log from '../log';

class ReviewProvider {
  constructor(config) {
    this.config = config;

    this.log = config.log || log;
    delete config.log;
  }

  init() {
    return Promise.resolve();
  }

  getReviews(_owner, _repo, _sha) {
    return Promise.reject('getReviews is not yet implemented!');
  }
}

export {
  ReviewProvider as default,
};
