import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import RepoCollaboratorsProvider from './repo_collaborators';
import { createTestLog } from '../test_helpers';

const SelfLogin = 'further-review';

function stubParamsCollaborators(logins) {
  return {
    github: {
      getCollaborators: async () => logins.map(l => ({ login: l })),
    },
    required: 2,
    log: createTestLog(),
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
        id: 'repo-collaborators',
        name: 'Repo Collaborators',
        required: 2,
        logins: ['abcdef', 'paultyng'],
      }]);
    });
});
