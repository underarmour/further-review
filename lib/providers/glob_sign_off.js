import minimatch from 'minimatch';

import SignOffProvider from './sign_off';

class GlobSignOffProvider extends SignOffProvider {
  async init(pr) {
    await super.init(pr);

    const { owner, repo, number } = pr;
    const files = await this.github.getPullRequestFiles({
      owner, repo, number,
    });

    this.files = files.map(f => f.filename);
  }

  renderSignOffDescription(so) {
    const globDescription = so.globMatch && so.globMatch.length > 0 ? `Glob match: ${so.globMatch.join(', ')}` : '';

    return `${super.renderSignOffDescription(so) || ''}\n${globDescription}`.trim();
  }

  async checkSignOff(so) {
    if (so.glob) {
      so.globMatch = this.files.filter(f => minimatch(f, so.glob));
      return so.globMatch.length > 0;
    }

    return true;
  }
}

export default GlobSignOffProvider;
