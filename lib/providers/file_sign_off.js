import SignOffProvider from './sign_off';
import { NotFoundError } from '../minihub';

class FileSignOffProvider extends SignOffProvider {
  async getFilePaths() {
    throw new TypeError('getFilePaths is not yet implemented!');
  }

  async getSignOffsFromFile(_contents, _path) {
    throw new TypeError('getSignOffsFromFile is not yet implemented!');
  }

  async getSignOffs() {
    const { owner, repo, sha } = this.pr;
    const paths = await this.getFilePaths();

    this.log.info(`Checking paths: ${paths.join(', ')}`);

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
      const signOffs = await this.getSignOffsFromFile(contents, path);

      return acc.concat(signOffs);
    }, []);
  }
}

export {
  FileSignOffProvider as default,
};
