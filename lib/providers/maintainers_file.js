import GithubFileProvider from './github_file_provider';
import parseLogin from '../parse_login';

class MaintainersFileProvider extends GithubFileProvider {
  async getFilePaths() {
    return ['MAINTAINERS'];
  }

  async getReviewsFromFile(owner, repo, sha, contents) {
    const logins = contents
      .split('\n')
      .filter(v => v && !v.startsWith('#'))
      .map(parseLogin);

    if (logins.length === 0) {
      return [];
    }

    this.log.debug(`MAINTAINERS: ${logins.join(',')}`);

    return [{
      id: 'MAINTAINERS-file',
      name: this.config.name || 'MAINTAINERS file',
      required: this.config.required,
      logins,
    }];
  }
}

export {
  MaintainersFileProvider as default,
};
