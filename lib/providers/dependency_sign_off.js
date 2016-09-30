import { arrayDifference } from '../common';
import { NotFoundError } from '../minihub';
import GlobSignOffProvider from './glob_sign_off';

const PackageJsonPath = 'package.json';

function dependenciesDiff(base, head) {
  const baseKeys = Object.keys(base || {});
  const headKeys = Object.keys(head || {});

  const changed = [];

  for (const key of baseKeys) {
    if (headKeys.includes(key)) {
      if (base[key] !== head[key]) {
        changed.push(key);
      }
    }
  }

  return {
    added: arrayDifference(headKeys, baseKeys),
    removed: arrayDifference(baseKeys, headKeys),
    changed,
  };
}

function packageJsonDiff(base, head) {
  const dependencyKeys = ['dependencies', 'devDependencies'];

  const dependencyDiff = dependencyKeys
    .map(key => dependenciesDiff(base[key], head[key]))
    .reduce((acc, diff) => {
      for (const att of Object.keys(diff)) {
        acc[att] = (acc[att] || []).concat(diff[att]);
      }
      return acc;
    }, {});

  const baseWithoutDependencies = Object.assign({}, base);
  const headWithoutDependencies = Object.assign({}, head);
  dependencyKeys.forEach(k => {
    delete baseWithoutDependencies[k];
    delete headWithoutDependencies[k];
  });

  dependencyDiff.other = JSON.stringify(baseWithoutDependencies)
    !== JSON.stringify(headWithoutDependencies);

  return dependencyDiff;
}

class DependencySignOffProvider extends GlobSignOffProvider {
  async getPackageJson(ref, path) {
    const { owner, repo } = this.pr;
    const file = await this.github.getContents({ owner, repo, ref, path });
    const contents = new Buffer(file.content, 'base64').toString('utf8');
    return JSON.parse(contents);
  }

  async init(pr) {
    await super.init(pr);

    const { sha, baseSha } = pr;

    let headPackageJson;
    let basePackageJson;

    this.log.info(`Checking for package.json in ${sha} and ${baseSha}`);

    try {
      headPackageJson = await this.getPackageJson(sha, PackageJsonPath);
      basePackageJson = await this.getPackageJson(baseSha, PackageJsonPath);
    } catch (err) {
      if (err instanceof NotFoundError) {
        this.log.info('package.json not found');
        return;
      }

      this.log.error(err);
      throw err;
    }

    this.log.info('Diffing package.json');

    this.packageJsonDiff = packageJsonDiff(basePackageJson, headPackageJson);
  }

  renderSignOffDescription(so) {
    const superDescription = super.renderSignOffDescription(so);

    if (!this.packageJsonDiff) {
      return superDescription;
    }

    const description = [superDescription || ''];
    const { packageJsonDiff: { added = [], removed = [], changed = [], other = false } = {} } = so;

    if (added.length > 0) {
      description.push(`Dependencies added: ${added.join(', ')}`);
    }

    if (removed.length > 0) {
      description.push(`Dependencies removed: ${removed.join(', ')}`);
    }

    if (changed.length > 0) {
      description.push(`Dependencies changed: ${changed.join(', ')}`);
    }

    if (other) {
      description.push('Other package.json changes');
    }

    return description.join('\n');
  }

  async checkSignOff(so) {
    const check = await super.checkSignOff(so);

    if (check === false) {
      return check;
    }

    if (!so.packageJson) {
      return check;
    }

    let otherGlobFiles = false;

    if (so.globMatch) {
      otherGlobFiles = so.globMatch.filter(f => f !== PackageJsonPath).length > 0;
    }

    this.log.info(`Checking package.json dependencies for ${so.name}`);

    if (!this.packageJsonDiff) {
      // if no package json, but pr has other files and glob applicable:
      // return glob check result otherwise this is not checked
      return otherGlobFiles;
    }

    const diff = so.packageJsonDiff = Object.assign({}, this.packageJsonDiff);
    const { added, removed, changed, other } = so.packageJson;

    if (!added) {
      diff.added = [];
    }

    if (!removed) {
      diff.removed = [];
    }

    if (!changed) {
      diff.changed = [];
    }

    if (!other) {
      diff.other = false;
    }

    if (diff.added.length > 0
      || diff.removed.length > 0
      || diff.changed.length > 0
      || diff.other === true) {
      return true;
    }

    return otherGlobFiles;
  }
}

export {
  DependencySignOffProvider as default,
  dependenciesDiff,
  packageJsonDiff,
};
