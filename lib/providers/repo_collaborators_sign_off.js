import SignOffProvider from './sign_off';

class RepoCollaboratorsSignOffProvider extends SignOffProvider {
  async getSignOffs() {
    const { owner, repo } = this.pr;
    const collaborators = await this.github.getCollaborators({ owner, repo });

    const logins = collaborators
      .map(c => c.login)
      .filter(l => l !== this.self.login);

    if (logins.length === 0) {
      // Not sure this is even possible as should always have one?
      return [];
    }

    this.log.debug(`Repo collaborators: ${logins.join(',')}`);

    return [{
      id: 'repo-collaborators',
      logins,
      name: this.options.name || 'Repo Collaborators',
      required: this.options.required,
    }];
  }
}

export {
  RepoCollaboratorsSignOffProvider as default,
};
