import Provider from './provider';
import {
  default as github,
} from '../minihub';

class GithubProvider extends Provider {
  constructor(config = {}) {
    super(config);

    this.github = config.github || github;
  }

  init() {
    return super.init()
      .then(() => this.github.getCurrentUser())
      .tap(u => {
        this.self = u;
      });
  }
}

export {
  GithubProvider as default,
};
