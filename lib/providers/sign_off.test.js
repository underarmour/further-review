import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import { default as SignOffProvider, cleanLogins } from './sign_off';
import { createTestLog } from '../test_helpers';

const SelfLogin = 'further-review';
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

  t.context.github = {
    createStatus: sinon.stub().returns(Promise.resolve()),
    getCurrentUser: sinon.stub().returns(Promise.resolve({ login: SelfLogin })),
    getIssueComments: sinon.stub().returns(
      Promise.resolve([
        { user: { login: 'visitor1' }, body: 'wut?' },
        { user: { login: 'signoff1' }, body: 'LGTM' },
      ])
    ),
    getPullRequestFiles: sinon.stub().returns(
      Promise.resolve(files.map(f => ({ filename: f })))
    ),
    createComment: sinon.stub().returns(Promise.resolve()),
    deleteComment: sinon.stub().returns(Promise.resolve()),
  };
});

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
  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        name: 'Test Review',
        logins: ['paul.tyng'],
      }];
    }
  }

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  t.is(result.comment, '');
});

test('SignOffProvider.getApprovals', async t => {
  class TestProvider extends SignOffProvider { }

  const p = new TestProvider({
    github: {
      getCurrentUser: () => Promise.resolve({ login: SelfLogin }),
      getIssueComments: () => Promise.resolve([
        { user: { login: 'paultyngno' }, body: 'just a comment' },
        { user: { login: SelfLogin }, body: 'LGTM' },
        { user: { login: 'paultyngyes' }, body: 'Yeah, this LGTM' },
        { user: { login: 'paultyngemoji' }, body: ':shipit:' },
      ]),
    },
  });

  await p.init();

  return p.getApprovals(t.context.pr)
    .then(signOffs => t.deepEqual(signOffs, ['paultyngemoji', 'paultyngyes']));
});

test('SignOffProvider.review - simple success', async t => {
  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['signoff1'],
      }];
    }
  }

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - simple failure', async t => {
  class TestProvider extends SignOffProvider {
    getSignOffs() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['nosignoff'],
      }];
    }
  }

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.false(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - subscription', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 2 required - success', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 2 required - failure', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.false(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - self sign - 1 required', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - glob miss success', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.true(result.success);
  // TODO: check comment?
});

test('SignOffProvider.review - glob hit failure', async t => {
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

  const p = new TestProvider({
    github: t.context.github,
    log: createTestLog(),
  });

  await p.init();

  const result = await p.review(t.context.pr);

  t.false(result.success);
  // TODO: check comment?
});
