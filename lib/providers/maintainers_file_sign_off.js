import FileSignOffProvider from './file_sign_off';
import parseLogin from '../parse_login';

class MaintainersFileSignOffProvider extends FileSignOffProvider {
  async getFilePaths() {
    return ['MAINTAINERS'];
  }

  async getSignOffsFromFile(owner, repo, sha, contents) {
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
      name: this.options.name || 'MAINTAINERS file',
      required: this.options.required,
      logins,
    }];
  }
}

export {
  MaintainersFileSignOffProvider as default,
};
