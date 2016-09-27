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

async function buildProvider(t, Type) {
  const p = new Type(t.context.options);
  await p.init();
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
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        name: 'Test Review',
        logins: ['paul.tyng'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.true(result.success);
  t.is(result.comment, '');
});

test('SignOffProvider.getApprovals', async t => {
  const { github, pr } = t.context;

  github.getIssueComments = sinon.spy(async () => [
    { user: { login: 'paultyngno' }, body: 'just a comment' },
    { user: { login: SelfLogin }, body: 'LGTM' },
    { user: { login: 'paultyngyes' }, body: 'Yeah, this LGTM' },
    { user: { login: 'paultyngemoji' }, body: ':shipit:' },
  ]);

  class TestProvider extends SignOffProvider { }

  const p = await buildProvider(t, TestProvider);
  const signOffs = await p.getApprovals(pr);

  t.deepEqual(signOffs, ['paultyngemoji', 'paultyngyes']);
});

test('SignOffProvider.review - simple success', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['signoff1'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - simple failure', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['nosignoff'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.false(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - subscription', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        required: 0,
        name: 'Test Review',
        logins: ['signoff1'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 2 required - success', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin, 'signoff1'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 2 required - failure', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin, 'nosignoff'],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.false(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 1 required', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin],
      }];
    }
  }

  const p = await buildProvider(t, TestProvider);
  const result = await p.review(pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - glob miss success', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
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
  const result = await p.review(pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - glob hit failure', async t => {
  const { pr } = t.context;

  class TestProvider extends SignOffProvider {
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
  const result = await p.review(pr);

  t.false(result.success);
  // TODO: check comment?
});
