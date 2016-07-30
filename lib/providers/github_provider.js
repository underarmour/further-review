import Provider from './provider';

class GithubProvider extends Provider {
  constructor(config = {}) {
    super(config);

    this.github = config.github;
    delete config.github;
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
