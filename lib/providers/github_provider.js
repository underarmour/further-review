import Provider from './provider';

class GithubProvider extends Provider {
  constructor(config = {}) {
    super(config);

    // Not yet supported in babel?
    // if (new.target === GithubProvider) {
    //   throw new TypeError('Cannot construct GithubProvider instances directly');
    // }

    this.github = config.github;
    delete config.github;
  }

  init() {
    // not using await due to issue with `super`
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
