import GithubFileProvider from '../github_file_provider';

class MaintainersFileProvider extends GithubFileProvider {
  getFilePaths() {
    return ['MAINTAINERS'];
  }

  getReviewsFromFile(owner, repo, sha, contents) {
    const logins = contents
      .split('\n')
      .filter(v => v && !v.startsWith('#'))
      .map(m => {
        let login = m.match(/\(([^\)]+)\)/);

        if (login && login[1].startsWith('@')) {
          return login[1].substring(1);
        }

        login = m.match(/^([^\(<]+)/);

        if (login && !login[0].trim().includes(' ')) {
          return login[0].trim();
        }

        return null;
      });

    if (logins.length === 0) {
      return [];
    }

    this.log.debug(`MAINTAINERS: ${logins.join(',')}`);

    return [{
      name: this.config.name || 'MAINTAINERS file',
      required: this.config.required,
      logins,
    }];
  }
}

export {
  MaintainersFileProvider as default,
};
