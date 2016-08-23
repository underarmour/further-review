import GitHubProvider from './github_provider';
import { NotFoundError } from '../minihub';

class GithubFileProvider extends GitHubProvider {
  constructor(config = {}) {
    super(config);

    // Not yet supported in babel?
    // if (new.target === GithubFileProvider) {
    //  throw new TypeError('Cannot construct GithubFileProvider instances directly');
    // }
  }

  async getFilePaths() {
    throw new TypeError('getFilePaths is not yet implemented!');
  }

  async getReviewsFromFile(_owner, _repo, _sha, _contents, _path) {
    throw new TypeError('getReviewsFromFile is not yet implemented!');
  }

  async getReviews(owner, repo, sha) {
    const paths = await this.getFilePaths();

    return paths.reduce(async (accPromise, path) => {
      const acc = await accPromise;
      let file;

      try {
        file = await this.github.getContents({ owner, repo, ref: sha, path });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return acc;
        }

        throw err;
      }

      this.log.info(`${path} found`);

      const contents = new Buffer(file.content, 'base64').toString('utf8');
      const reviews = await this.getReviewsFromFile(owner, repo, sha, contents, path);

      return acc.concat(reviews);
    }, []);
  }
}

export {
  GithubFileProvider as default,
};
