import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import { createProviderOptions } from '../test_helpers';
import FileSignOffProvider from './file_sign_off';

class TestProvider extends FileSignOffProvider {
  async getSignOffsFromFile(_owner, _repo, _sha, _contents, path) {
    if (path === 'file2.js') {
      return [{ name: 'Test', logins: ['paultyng'] }];
    }

    return [];
  }

  async getFilePaths() {
    return ['file1.js', 'file2.js'];
  }
}

test.beforeEach(async t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    sha: 'abcd1234',
  };

  const { github } = t.context.options = createProviderOptions();
  t.context.github = github;

  const p = t.context.provider = new TestProvider(t.context.options);
  await p.init();
});

test('Abstract', t => {
  class AbstractTest extends FileSignOffProvider { }
  const at = new AbstractTest();

  t.throws(at.getFilePaths(), TypeError);
  t.throws(at.getSignOffsFromFile(), TypeError);
});

test('FileSignOffProvider.getSignOffs', async t => {
  const { pr, github, provider } = t.context;

  github.getContents = sinon.spy(async () => ({ content: '' }));

  const reviews = await provider.getSignOffs(pr);

  t.true(github.getContents.calledTwice);
  t.is(reviews.length, 1);
  t.deepEqual(reviews[0], { name: 'Test', logins: ['paultyng'] });
});

test('FileSignOffProvider.getSignOffs - NotFoundError', async t => {
  const { pr, provider } = t.context;

  const reviews = await provider.getSignOffs(pr);

  t.deepEqual(reviews, []);
});
