import minimatch from 'minimatch';

const globSignOffMixin = Base => class extends Base {
  async init(pr) {
    await super.init(pr);

    const { owner, repo, number } = this.pr;
    const files = await this.github.getPullRequestFiles({
      owner, repo, number,
    });

    this.files = files.map(f => f.filename);
  }

  renderSignOffDescription(so) {
    const globDescription = so.globMatch && so.globMatch.length > 0 ? `Glob match: ${so.globMatch.join(', ')}` : '';

    return `${super.renderSignOffDescription(so) || ''}\n${globDescription}`.trim();
  }

  async isSignOffApplicable(so) {
    const superApplicable = await super.isSignOffApplicable(so);

    if (so.glob) {
      so.globMatch = this.files.filter(f => minimatch(f, so.glob));
      return superApplicable && so.globMatch.length > 0;
    }

    return superApplicable;
  }
};

export default globSignOffMixin;
