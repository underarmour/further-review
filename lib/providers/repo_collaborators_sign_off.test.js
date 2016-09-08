import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import RepoCollaboratorsSignOffProvider from './repo_collaborators_sign_off';
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

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    sha: 'abcd1234',
  };
});

test('RepoCollaboratorsProvider', t => {
  const provider = new RepoCollaboratorsSignOffProvider(
    stubParamsCollaborators(['paultyng', SelfLogin, 'abcdef'])
  );

  provider.self = {
    login: SelfLogin,
  };

  return provider.getSignOffs(t.context.pr)
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
