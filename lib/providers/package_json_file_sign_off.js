import url from 'url';

import normalizePackageData from 'normalize-package-data';

import FileSignOffProvider from './file_sign_off';

class PackageJsonFileSignOffProvider extends FileSignOffProvider {
  async getFilePaths() {
    return ['package.json'];
  }

  async getSignOffsFromFile(contents) {
    const githubHost = url.parse(this.self.html_url).hostname;
    let packageJson;
    try {
      packageJson = JSON.parse(contents);
      normalizePackageData.fixer.fixPeople(packageJson);
    } catch (err) {
      this.log.warn('Unable to parse package.json');
      this.log.warn(err);

      return [];
    }
    const maintainers = packageJson.maintainers || [];

    const logins = maintainers.map(m => {
      if (m.url) {
        const parsed = url.parse(m.url);

        if (githubHost === parsed.hostname) {
          const login = parsed.pathname.split('/')[1];
          if (login) {
            return login;
          }
        }

        if (m.url.startsWith('@')) {
          const login = m.url.substring(1);
          if (login) {
            return login;
          }
        }
      }

      this.log.warn(`Unable to determine login for ${m}`);

      return null;
    })
    .filter(l => l);

    if (logins.length === 0) {
      return [];
    }

    this.log.debug(`package.json: ${logins.join(',')}`);

    return [{
      id: 'package.json-file',
      name: this.options.name || 'package.json file',
      required: this.options.required,
      logins,
    }];
  }
}

export {
  PackageJsonFileSignOffProvider as default,
};
