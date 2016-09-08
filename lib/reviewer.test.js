/* eslint-disable max-len */

import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import { dedent } from './common';
import BaseProvider from './providers/base';
import { createTestLog, createTestConfig } from './test_helpers';
import Reviewer from './reviewer';

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
        state: 'open',
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

test('Reviewer.updateStatus', async t => {
  const r = new Reviewer({
    github: t.context.github,
  });

  await r.updateStatus(t.context.pr, 'pending', 'Test Description');

  t.true(t.context.github.createStatus.calledOnce);

  const call = t.context.github.createStatus.getCall(0);

  const { owner, repo, sha } = t.context.pr;

  t.deepEqual(call.args[0], Object.assign({}, {
    owner,
    repo,
    sha,
    state: 'pending',
    description: 'Test Description',
    context: 'Further Review',
    targetUrl: null,
  }));
});

test('Reviewer.getSignOffs - disabled provider', async t => {
  class TestProvider extends BaseProvider {
    async review() {
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

test('Reviewer.getSignOffs - provider config', async t => {
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

test('Reviewer.review - simple success', async t => {
  class TestProvider extends BaseProvider {
    async review() {
      return {
        success: true,
        comment: 'Test comment',
      };
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

  await r.review(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'success']
  );
});

test('SignOffProvider.review - already commented', async t => {
  class TestProvider extends BaseProvider {
    async review() {
      return {
        success: false,
      };
    }
  }

  const expectedBody = dedent`
    <!--
    further-review: {"sha":"${t.context.pr.sha}","providers":["test_provider"]}
    -->
    ## Further Review Needed
  `.trim();

  t.context.github.getIssueComments = sinon.stub().returns(Promise.resolve([
    // eslint-disable-next-line max-len
    { user: { login: SelfLogin }, body: expectedBody },
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

  await r.review(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.false(t.context.github.createComment.calledOnce);
  t.false(t.context.github.deleteComment.calledOnce);
});

test('Reviewer.review - already commented - new review', async t => {
  class TestProvider extends BaseProvider {
    async review() {
      return {
        success: false,
      };
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

  await r.review(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.true(t.context.github.createComment.calledOnce);
  t.true(t.context.github.deleteComment.calledOnce);
  // TODO: test comment data...
});

test('Reviewer.review - mentions', async t => {
  class TestProvider extends BaseProvider {
    async review() {
      return {
        success: false,
      };
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

  await r.review(t.context.pr);

  t.true(t.context.github.createStatus.calledTwice);
  t.deepEqual(
    t.context.github.createStatus.args.map(([{ state }]) => state),
    ['pending', 'failure']
  );
  t.true(t.context.github.createComment.calledOnce);
  t.false(t.context.github.deleteComment.calledOnce);
  // TODO: test comment data...
});

test('Reviewer.review - pr state', async t => {
  const r = new Reviewer({
    github: {
      getCurrentUser: t.context.github.getCurrentUser,
      getPullRequest: async () => ({ state: 'closed' }),
      // No other methods should be called (specifically update status, etc)
    },
    log: createTestLog(),
  });

  await r.review(t.context.pr);

  // TODO: assertions?
});

test('Reviewer.renderComment', t => {
  const r = new Reviewer({
    config: key => {
      if (key !== 'comment:footer') throw new Error(`Unexpected key ${key}`);

      return 'Footer';
    },
    log: createTestLog(),
  });

  const results = [
    {
      name: 'TestName',
      comment: 'Some comment',
    },
  ];

  const state = {
    foo: 'bar',
  };

  const comment = r.renderComment(results, state);

  t.is(comment, dedent`
    <!--
    further-review: {"foo":"bar"}
    -->
    ## Further Review Needed

    Some comment

    Footer
  `.trimLeft());
});
