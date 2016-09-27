import { arrayDifference } from '../common';
import { NotFoundError } from '../minihub';

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
  return ['dependencies', 'devDependencies']
    .map(key => dependenciesDiff(base[key], head[key]))
    .reduce((acc, diff) => {
      for (const att of Object.keys(diff)) {
        acc[att] = (acc[att] || []).concat(diff[att]);
      }
      return acc;
    }, {});
}

const packageJsonDependencySignOffMixin = Base => class extends Base {
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
      const path = 'package.json';
      headPackageJson = await this.getPackageJson(sha, path);
      basePackageJson = await this.getPackageJson(baseSha, path);
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
    const { dependencyDiff: { added = [], removed = [], changed = [] } = {} } = so;

    if (added.length > 0) {
      description.push(`Dependencies added: ${added.join(', ')}`);
    }

    if (removed.length > 0) {
      description.push(`Dependencies removed: ${removed.join(', ')}`);
    }

    if (changed.length > 0) {
      description.push(`Dependencies changed: ${changed.join(', ')}`);
    }

    return description.join('\n');
  }

  async isSignOffApplicable(so) {
    if (so.dependencyAdded || so.dependencyRemoved || so.dependencyChanged) {
      this.log.info(`Checking package JSON dependencies for ${so.name}`);

      if (!this.packageJsonDiff) {
        return false;
      }

      const diff = so.dependencyDiff = Object.assign({}, this.packageJsonDiff);

      if (!so.dependencyAdded) {
        diff.added = [];
      }

      if (!so.dependencyRemoved) {
        diff.removed = [];
      }

      if (!so.dependencyChanged) {
        diff.changed = [];
      }

      if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
        return false;
      }
    }

    return await super.isSignOffApplicable(so);
  }
};

export {
  packageJsonDependencySignOffMixin as default,
  dependenciesDiff,
  packageJsonDiff,
};
