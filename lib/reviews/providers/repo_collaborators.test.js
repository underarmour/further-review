import test from 'ava';
import Promise from 'bluebird';

import RepoCollaboratorsProvider from './repo_collaborators';

const SelfLogin = 'further-review';

function stubParamsCollaborators(logins) {
  return {
    github: {
      getCollaborators: () => Promise.resolve(logins.map(l => ({ login: l }))),
    },
    required: 2,
  };
}

test('RepoCollaboratorsProvider', t => {
  const provider = new RepoCollaboratorsProvider(
    stubParamsCollaborators(['paultyng', SelfLogin, 'abcdef'])
  );

  provider.self = {
    login: SelfLogin,
  };

  return provider.getReviews('owner', 'repo', 'sha')
    .then(maintainers => {
      maintainers.forEach(m => {
        m.logins = m.logins.sort();
      });

      t.deepEqual(maintainers, [{
        name: 'Repo Collaborators',
        required: 2,
        logins: ['abcdef', 'paultyng'],
      }]);
    });
});
