import url from 'url';

import normalizePackageData from 'normalize-package-data';

import GithubFileProvider from './github_file_provider';

class PackageJsonFileProvider extends GithubFileProvider {
  getFilePaths() {
    return ['package.json'];
  }

  getReviewsFromFile(owner, repo, sha, contents) {
    const githubHost = url.parse(this.self.html_url).hostname;
    const packageJson = JSON.parse(contents);
    normalizePackageData.fixer.fixPeople(packageJson);
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

      return null;
    })
    .filter(l => l);

    if (logins.length === 0) {
      return [];
    }

    this.log.debug(`package.json: ${logins.join(',')}`);

    return [{
      id: 'package.json-file',
      name: this.config.name || 'package.json file',
      required: this.config.required,
      logins,
    }];
  }
}

export {
  PackageJsonFileProvider as default,
};
