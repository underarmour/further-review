import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import Provider from './providers/provider';
import { createTestLog, createTestConfig } from './test_helpers';
import {
  default as Reviewer,
  cleanLogins,
} from './reviewer';

const SelfLogin = 'further-review';
const PrLogin = 'proposer';

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    number: 32,

    user: { login: PrLogin },
    sha: 'abcd1234',
    files: [
      'file1.js',
      'file2.js',
    ],
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
    getPullRequest: sinon.stub().returns(
      Promise.resolve({
        user: { login: t.context.pr.user.login },
        head: { sha: t.context.pr.sha },
      })
    ),
    getPullRequestFiles: sinon.stub().returns(
      Promise.resolve([
        { filename: 'file1.js' },
        { filename: 'file2.js' },
      ])
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

test('getCommentState', t => {
  const reviewer = new Reviewer({ log: createTestLog() });
  const body = `<!--\nfurther-review: { "key": "value" }\n-->\n# Something here...\n\nSome body`;
  const state = reviewer.getCommentState(body);

  t.deepEqual(state, { key: 'value' });
});

test('getCommentState - bad state', t => {
  const reviewer = new Reviewer({ log: createTestLog() });
  const body = `<!--\nfurther-review: undefined\n-->\n# Something here...\n\nSome body`;
  const state = reviewer.getCommentState(body);

  t.is(state, null);
});


test('getCommentState - missing state', t => {
  const reviewer = new Reviewer({ log: createTestLog() });
  const body = `# Something here...\n\nSome body`;
  const state = reviewer.getCommentState(body);

  t.is(state, null);
});

test('Reviewer.getSignOffs', t => {
  const r = new Reviewer({
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

  return r.getSignOffs(t.context.pr)
    .then(signOffs => t.deepEqual(signOffs, ['paultyngemoji', 'paultyngyes']));
});

test('Reviewer.updateStatus', async t => {
  const r = new Reviewer({
    github: t.context.github,
  });

  const { owner, repo, sha } = t.context.pr;

  const statusParams = {
    owner,
    repo,
    sha,
    state: 'pending',
    description: 'Test Description',
  };

  await r.updateStatus(statusParams);

  t.true(t.context.github.createStatus.calledOnce);

  const call = t.context.github.createStatus.getCall(0);

  t.deepEqual(call.args[0], Object.assign({}, statusParams, {
    context: 'Further Review',
    targetUrl: null,
  }));
});

test('Reviewer.getReviews - disabled provider', async t => {
  class TestProvider extends Provider {
    getReviews() {
      throw new Error('Should not be called!');
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: false,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  const initializedProviders = await r.initProviders();
  t.deepEqual(initializedProviders, []);
});

test('Reviewer.getReviews - provider config', async t => {
  const providerConstructor = sinon.stub().returns({
    init: sinon.stub(),
  });

  const providers = { test_provider: providerConstructor };
  const config = createTestConfig({
    review: {
      test_provider: {
        foo: 'bar',
      },
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.initProviders();

  t.true(providerConstructor.calledOnce);
  const { foo } = providerConstructor.getCall(0).args[0];
  t.is(foo, 'bar');
});

test('Reviewer.getReviews - invalid login', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        name: 'Test Review',
        logins: ['paul.tyng'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  const reviews = await r.getReviews(t.context.pr);
  t.deepEqual(reviews, []);
});

test('Reviewer.processReviews - simple success', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['signoff1'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'success']
  );
});

test('Reviewer.processReviews - subscription', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        required: 0,
        name: 'Test Review',
        logins: ['signoff1'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'success']
  );
  t.true(t.context.github.createComment.calledOnce);
});

test('Reviewer.processReviews - self sign - 2 required - success', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin, 'signoff1'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'success']
  );
});

test('Reviewer.processReviews - self sign - 2 required - failure', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin, 'nosignoff'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
});

test('Reviewer.processReviews - self sign - 1 required', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        required: 2,
        name: 'Test Review',
        logins: [PrLogin],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'success']
  );
});

test('Reviewer.processReviews - already commented', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['mention1', 'mention2'],
      }];
    }
  }

  t.context.github.getIssueComments = sinon.stub().returns(Promise.resolve([
    // eslint-disable-next-line max-len
    { user: { login: SelfLogin }, body: `<!--\nfurther-review: { "sha": "${t.context.pr.sha}", "reviews": ["abc"] }\n-->\nBlah blah....` },
  ]));

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.false(t.context.github.createComment.calledOnce);
  t.false(t.context.github.deleteComment.calledOnce);
});

test('Reviewer.processReviews - already commented - new review', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'def',
        name: 'Test Review',
        logins: ['mention1', 'mention2'],
      }];
    }
  }

  t.context.github.getIssueComments = sinon.stub().returns(Promise.resolve([
    // eslint-disable-next-line max-len
    { user: { login: SelfLogin }, body: `<!--\nfurther-review: { "sha": "${t.context.pr.sha}", "reviews": ["abc"] }\n-->\nBlah blah....` },
  ]));

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.true(t.context.github.createComment.calledOnce);
  t.true(t.context.github.deleteComment.calledOnce);
  // TODO: test comment data...
});

test('Reviewer.processReviews - mentions', async t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        id: 'abc',
        name: 'Test Review',
        logins: ['mention1', 'mention2'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    review: {
      test_provider: true,
    },
  });

  const r = new Reviewer({
    config,
    github: t.context.github,
    providers,
    log: createTestLog(),
  });

  await r.processReviews(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.true(t.context.github.createComment.calledOnce);
  t.false(t.context.github.deleteComment.calledOnce);
  // TODO: test comment data...
});
