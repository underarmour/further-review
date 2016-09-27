import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import SignOffProvider from './sign_off';
import globSignOffMixin from './glob_sign_off_mixin';
import { createProviderOptions } from '../test_helpers';

const PrLogin = 'proposer';
const files = [
  'file1.js',
  'file2.js',
];

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    number: 32,
    proposer: PrLogin,
    sha: 'abcd1234',
  };

  const { github } = t.context.options = createProviderOptions();
  t.context.github = github;

  github.getIssueComments = sinon.spy(async () => [
    { user: { login: 'visitor1' }, body: 'wut?' },
    { user: { login: 'signoff1' }, body: 'LGTM' },
  ]);

  github.getPullRequestFiles = sinon.spy(async () => files.map(filename => ({ filename })));
});

async function buildProvider(t, Type) {
  const { options, pr } = t.context;
  const p = new Type(options);
  await p.init(pr);
  return p;
}

test('globSignOffMixin.review - glob miss success', async t => {
  class TestProvider extends globSignOffMixin(SignOffProvider) {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['nosignoff'],
        glob: 'nofile.js',
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const { success, signOffs } = await p.review();

  t.true(success);
  t.is(signOffs.length, 0);
});

test('globSignOffMixin.review - glob hit failure', async t => {
  class TestProvider extends globSignOffMixin(SignOffProvider) {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['nosignoff'],
        glob: 'file1.js',
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const { success, signOffs } = await p.review();

  t.false(success);
  t.is(signOffs.length, 1);

  const [{ globMatch }] = signOffs;
  t.deepEqual(globMatch, ['file1.js']);
});
