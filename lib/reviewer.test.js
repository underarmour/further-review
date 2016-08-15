import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import Provider from './providers/provider';
import { createTestLog, createTestConfig } from './test_helpers';
import {
  default as Reviewer,
  getMentions,
  isGlobMatch,
  cleanLogins,
} from './reviewer';

const SelfLogin = 'further-review';

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    sha: 'abcd1234',
    number: 32,
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
        { body: 'wut?', user: { login: 'visitor1' } },
        { body: 'LGTM', user: { login: 'signoff1' } },
        { body: '* @alreadymentioned1', user: { login: SelfLogin } },
        { body: '* @alreadymentioned2', user: { login: SelfLogin } },
        { body: '* @alreadymentioned3', user: { login: SelfLogin } },
      ])
    ),
    getPullRequestFiles: sinon.stub().returns(
      Promise.resolve([
        { filename: 'file1.js' },
        { filename: 'file2.js' },
      ])
    ),
    createComment: sinon.stub().returns(Promise.resolve()),
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

test('isGlobMatch - matches file set', t => {
  const files = ['package.json'];
  const glob = 'package.json';

  t.true(isGlobMatch(files, glob));
});

test('isGlobMatch - does not match file set', t => {
  const files = ['Dockerfile'];
  const glob = 'package.json';

  t.false(isGlobMatch(files, glob));
});

test('isGlobMatch - complex match', t => {
  const files = ['Dockerfile', 'schema/deploy.yaml', 'index.js'];
  const glob = '{package.json,schema/**/*.{yaml,yml}}';

  t.true(isGlobMatch(files, glob));
});

function stubParamsGitHubComments(comments) {
  return {
    github: {
      getCurrentUser: () => Promise.resolve({ login: SelfLogin }),
      getIssueComments: () => Promise.resolve(comments),
    },
    owner: 'paultyng',
    repo: 'further-review',
    login: SelfLogin,
  };
}

test('getMentions', t => {
  return getMentions(stubParamsGitHubComments([
    '@BeGinning @middle @END',
    '@twice',
    '@twice',
    '\n@Chars-1-2-3\n@newlines\n',
  ].map(body => ({ user: { login: SelfLogin }, body }))))
  .then(mentions => {
    t.deepEqual(mentions, [
      'beginning',
      'chars-1-2-3',
      'end',
      'middle',
      'newlines',
      'twice',
    ]);
  });
});

test('getMentions - invalid login', t => {
  return getMentions(stubParamsGitHubComments([
    '@paul.tyng',
  ].map(body => ({ user: { login: SelfLogin }, body }))))
  .then(mentions => {
    // technically this is probably wrong, but since the login is invalid,
    // not sure the proper behavior
    t.deepEqual(mentions, ['paul']);
  });
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

test('Reviewer.updateStatus', t => {
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

  return r.updateStatus(statusParams)
    .then(() => {
      t.true(t.context.github.createStatus.calledOnce);

      const call = t.context.github.createStatus.getCall(0);

      t.deepEqual(call.args[0], Object.assign({}, statusParams, {
        context: 'Further Review',
        targetUrl: null,
      }));
    });
});

test('Reviewer.getReviews - invalid login', t => {
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

  return r.getReviews(t.context.pr)
    .tap((reviews) => {
      t.deepEqual(reviews, []);
    });
});

test('Reviewer.processReviews - simple success', t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
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

  return r.processReviews(t.context.pr)
    .tap(() => {
      t.true(t.context.github.createStatus.calledTwice);
      t.deepEqual(
        t.context.github.createStatus.args.map(([{ state }]) => state),
        ['pending', 'success']
      );
    });
});

test('Reviewer.processReviews - mentions', t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
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

  return r.processReviews(t.context.pr)
    .tap(() => {
      t.true(t.context.github.createStatus.calledTwice);
      t.deepEqual(
        t.context.github.createStatus.args.map(([{ state }]) => state),
        ['pending', 'failure']
      );
      t.is(1, t.context.github.createComment.callCount);
      // TODO: test comment data...
    });
});

test('Reviewer.processReviews - max mentions', t => {
  class TestProvider extends Provider {
    getReviews() {
      return [{
        name: 'Test Review',
        logins: ['mention1', 'mention2'],
      }];
    }
  }

  const providers = { test_provider: TestProvider };
  const config = createTestConfig({
    max_mention_comments: 2,
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

  return r.processReviews(t.context.pr)
    .tap(() => {
      t.true(t.context.github.createStatus.calledTwice);
      t.deepEqual(
        t.context.github.createStatus.args.map(([{ state }]) => state),
        ['pending', 'failure']
      );
      t.false(t.context.github.createComment.called);
      // TODO: test comment data...
    });
});
