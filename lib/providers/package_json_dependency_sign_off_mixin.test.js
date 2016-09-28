import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import { NotFoundError } from '../minihub';
import SignOffProvider from './sign_off';
import {
  default as packageJsonDependencySignOffMixin,
  dependenciesDiff,
  packageJsonDiff,
} from './package_json_dependency_sign_off_mixin';
import { createProviderOptions } from '../test_helpers';

const PrLogin = 'proposer';
const BaseSha = 'abcd1234';
const HeadSha = 'efgh5678';
const HeadShaRemovedOnly = 'removed';

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    number: 32,
    proposer: PrLogin,
    sha: HeadSha,
    baseSha: BaseSha,
  };

  const { github } = t.context.options = createProviderOptions();
  t.context.github = github;

  github.getIssueComments = sinon.spy(async () => [
    { user: { login: 'visitor1' }, body: 'wut?' },
    { user: { login: 'signoff1' }, body: 'LGTM' },
  ]);

  function getContents(ref) {
    switch (ref) {
      case BaseSha:
        return JSON.stringify({
          dependencies: {
            foo: '^1.0.0',
            bar: '^2.0.0',
          },
        });
      case HeadSha:
        return JSON.stringify({
          dependencies: {
            bar: '^3.0.0',
            baz: '^2.1.3',
          },
        });
      case HeadShaRemovedOnly:
        return JSON.stringify({
          dependencies: {
            foo: '^1.0.0',
          },
        });
      default:
        throw new NotFoundError();
    }
  }

  github.getContents = sinon.spy(async ({ ref }) => {
    const content = new Buffer(getContents(ref), 'utf8')
      .toString('base64');

    return {
      content,
    };
  });
});

class TestProvider extends packageJsonDependencySignOffMixin(SignOffProvider) {
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

test('dependenciesDiff - added', t => {
  const result = dependenciesDiff({
    foo: '^1.0.0',
  }, {
    foo: '^1.0.0',
    bar: '^2.0.0',
  });

  t.deepEqual(result, {
    added: ['bar'],
    removed: [],
    changed: [],
  });
});

test('dependenciesDiff - removed', t => {
  const result = dependenciesDiff({
    foo: '^1.0.0',
    bar: '^2.0.0',
  }, {
    foo: '^1.0.0',
  });

  t.deepEqual(result, {
    added: [],
    removed: ['bar'],
    changed: [],
  });
});

test('dependenciesDiff - changed', t => {
  const result = dependenciesDiff({
    foo: '^1.0.0',
    bar: '^2.0.0',
  }, {
    foo: '^1.0.0',
    bar: '^3.0.0',
  });

  t.deepEqual(result, {
    added: [],
    removed: [],
    changed: ['bar'],
  });
});

test('dependenciesDiff - unchanged', t => {
  const result = dependenciesDiff({
    foo: '^1.0.0',
    bar: '^2.0.0',
  }, {
    foo: '^1.0.0',
    bar: '^2.0.0',
  });

  t.deepEqual(result, {
    added: [],
    removed: [],
    changed: [],
  });
});

test('packageJsonDiff - dependencies', t => {
  const result = packageJsonDiff({
    dependencies: {},
    devDependencies: {},
  }, {
    dependencies: {
      foo: '^1.0.0',
    },
    devDependencies: {},
  });

  t.deepEqual(result, {
    added: ['foo'],
    removed: [],
    changed: [],
  });
});

test('packageJsonDiff - devDependencies', t => {
  const result = packageJsonDiff({
    dependencies: {},
    devDependencies: {},
  }, {
    dependencies: {},
    devDependencies: {
      foo: '^1.0.0',
    },
  });

  t.deepEqual(result, {
    added: ['foo'],
    removed: [],
    changed: [],
  });
});

test('packageJsonDependencySignOffMixin.review - no package.json', async t => {
  t.context.pr.sha = 'nopackagejson';

  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['nosignoff'],
    dependencyAdded: true,
  }]);
  const { success, signOffs } = await p.review();

  t.true(success);
  t.is(signOffs.length, 0);
});

test('packageJsonDependencySignOffMixin.review - unchanged package.json', async t => {
  t.context.pr.sha = t.context.pr.baseSha;

  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['nosignoff'],
    dependencyAdded: true,
  }]);
  const { success, signOffs } = await p.review();

  t.true(success);
  t.is(signOffs.length, 0);
});

test('packageJsonDependencySignOffMixin.review - modified package.json', async t => {
  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['nosignoff'],
    dependencyAdded: true,
  }]);
  const { success, signOffs } = await p.review();

  t.false(success);
  t.is(signOffs.length, 1);

  const [{ logins }] = signOffs;

  t.deepEqual(logins, ['nosignoff']);
});

test('packageJsonDependencySignOffMixin.review - modified package.json - all flags', async t => {
  t.context.pr.sha = HeadShaRemovedOnly;

  const p = await buildProvider(t, [{
    id: 'abc',
    name: 'Test Review',
    logins: ['nosignoff'],
    dependencyAdded: true,
    dependencyRemoved: true,
    dependencyChanged: true,
  }]);
  const { success, signOffs } = await p.review();

  t.false(success);
  t.is(signOffs.length, 1);

  const [{ logins }] = signOffs;

  t.deepEqual(logins, ['nosignoff']);
});
