import GitHubProvider from '../github_provider';

class RepoCollaboratorsProvider extends GitHubProvider {
  getReviews(owner, repo, _sha) {
    return this.github.getCollaborators({ owner, repo })
      .map(c => c.login)
      .filter(l => l !== this.self.login)
      .then(logins => {
        if (logins.length === 0) return [];

        this.log.debug(`Repo collaborators: ${logins.join(',')}`);

        return [{
          logins,
          name: this.config.name || 'Repo Collaborators',
          required: this.config.required,
        }];
      });
  }
}

export {
  RepoCollaboratorsProvider as default,
};
