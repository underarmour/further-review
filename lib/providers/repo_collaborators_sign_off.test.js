import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import RepoCollaboratorsSignOffProvider from './repo_collaborators_sign_off';
import { createProviderOptions, SelfLogin } from '../test_helpers';

test.beforeEach(async t => {
  const pr = t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    sha: 'abcd1234',
  };

  const logins = t.context.logins = ['paultyng', SelfLogin, 'abcdef'];

  const { github } = t.context.options = createProviderOptions({ required: 2 });
  t.context.github = github;

  github.getCollaborators = sinon.spy(async () => logins.map(l => ({ login: l })));

  const p = t.context.provider = new RepoCollaboratorsSignOffProvider(t.context.options);
  await p.init(pr);
});

test('RepoCollaboratorsProvider', async t => {
  const { provider, pr } = t.context;

  const maintainers = await provider.getSignOffs(pr);

  // normalized list for comparison
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
