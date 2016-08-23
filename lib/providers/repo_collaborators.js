import GitHubProvider from './github_provider';

class RepoCollaboratorsProvider extends GitHubProvider {
  async getReviews(owner, repo, _sha) {
    const collaborators = await this.github.getCollaborators({ owner, repo });

    const logins = collaborators
      .map(c => c.login)
      .filter(l => l !== this.self.login);

    if (logins.length === 0) {
      return [];
    }

    this.log.debug(`Repo collaborators: ${logins.join(',')}`);

    return [{
      id: 'repo-collaborators',
      logins,
      name: this.config.name || 'Repo Collaborators',
      required: this.config.required,
    }];
  }
}

export {
  RepoCollaboratorsProvider as default,
};
