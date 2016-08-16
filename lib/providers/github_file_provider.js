import Promise from 'bluebird';

import GitHubProvider from './github_provider';
import { NotFoundError } from '../minihub';

class GithubFileProvider extends GitHubProvider {
  getFilePaths() {
    return Promise.reject('getFilePaths is not yet implemented!');
  }

  getReviewsFromFile(_owner, _repo, _sha, _contents, _path) {
    return Promise.reject('getReviewsFromFile is not yet implemented!');
  }

  getReviews(owner, repo, sha) {
    return Promise.resolve(this.getFilePaths())
      .reduce((acc, path) => {
        return this.github.getContents({ owner, repo, ref: sha, path })
          .tap(() => this.log.info(`${path} found`))
          .then(contents => new Buffer(contents.content, 'base64').toString('utf8'))
          .then(contents => this.getReviewsFromFile(owner, repo, sha, contents, path))
          .then(reviews => acc.concat(reviews))
          .catch(NotFoundError, () => acc);
      }, []);
  }
}

export {
  GithubFileProvider as default,
};
