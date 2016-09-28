import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import { default as SignOffProvider, cleanLogins } from './sign_off';
import { createProviderOptions, SelfLogin } from '../test_helpers';

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

class TestProvider extends SignOffProvider {
  constructor(options) {
    super(options);

    const { signOffs } = options;
    this.signOffs = signOffs;
  }

  async getSignOffs() {
    return this.signOffs;
  }
}

async function buildProvider(t, signOffs) {
  const { options, pr } = t.context;
  const newOptions = Object.assign({}, options, { signOffs });
  const p = new TestProvider(newOptions);
  await p.init(pr);
  return p;
}

test('cleanLogins - invalid login', t => {
  t.deepEqual(cleanLogins(['paul.tyng']), []);
});

test('cleanLogins - unique', t => {
  t.deepEqual(cleanLogins(['a', 'a']), ['a']);
});

test('cleanLogins - sort', t => {
  t.deepEqual(cleanLogins(['d', 'a', 'c', 'b']), ['a', 'b', 'c', 'd']);
});

test('SignOffProvider.getSignOffs - invalid login', async t => {
  const p = await buildProvider(t, [{
    name: 'Test Review',
    logins: ['paul.tyng'],
  }]);
  const { success, comment } = await p.review();

  t.true(success);
  t.is(comment, '');
});

test('SignOffProvider.getApprovals', async t => {
  const { github } = t.context;

  github.getIssueComments = sinon.spy(async () => [
    { user: { login: 'paultyngno' }, body: 'just a comment' },
    { user: { login: SelfLogin }, body: 'LGTM' },
    { user: { login: 'paultyngyes' }, body: 'Yeah, this LGTM' },
    { user: { login: 'paultyngemoji' }, body: ':shipit:' },
  ]);

  const p = await buildProvider(t, []);
  const signOffs = await p.getApprovals();

  t.deepEqual(signOffs, ['paultyngemoji', 'paultyngyes']);
});

test('SignOffProvider.review - simple success', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['signoff1'],
  }]);
  const { success } = await p.review();

  t.true(success);
});

test('SignOffProvider.review - simple failure', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['nosignoff'],
  }]);
  const { success } = await p.review();

  t.false(success);
});

test('SignOffProvider.review - subscription', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    required: 0,
    name: 'Test Review',
    logins: ['signoff1'],
  }]);
  const { success } = await p.review();

  t.true(success);
});

test('SignOffProvider.review - self sign - 2 required - success', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    required: 2,
    name: 'Test Review',
    logins: [PrLogin, 'signoff1'],
  }]);
  const { success } = await p.review();

  t.true(success);
});

test('SignOffProvider.review - self sign - 2 required - failure', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    required: 2,
    name: 'Test Review',
    logins: [PrLogin, 'nosignoff'],
  }]);
  const { success } = await p.review();

  t.false(success);
});

test('SignOffProvider.review - self sign - 1 required', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    required: 2,
    name: 'Test Review',
    logins: [PrLogin],
  }]);
  const { success } = await p.review();

  t.true(success);
});
