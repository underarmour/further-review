import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import { NotFoundError } from '../minihub';
import { createTestLog } from '../test_helpers';
import FileSignOffProvider from './file_sign_off';

test.beforeEach(t => {
  t.context.pr = {
    owner: 'paultyng',
    repo: 'further-review',
    sha: 'abcd1234',
  };
});

test('Abstract', t => {
  class AbstractTest extends FileSignOffProvider { }
  const at = new AbstractTest();

  t.throws(at.getFilePaths(), TypeError);
  t.throws(at.getSignOffsFromFile(), TypeError);
});

class TestProvider extends FileSignOffProvider {
  constructor(config) {
    super(config);

    this.getSignOffsFromFile = sinon
      .stub();

    this.getSignOffsFromFile
      .onFirstCall()
      .returns(Promise.resolve([]))

      .onSecondCall()
      .returns(Promise.resolve([{ name: 'Test', logins: ['paultyng'] }]));
  }

  async getFilePaths() {
    return ['file1.js', 'file2.js'];
  }
}

test('FileSignOffProvider.getSignOffs', t => {
  const github = {
    getContents: sinon.stub().returns(
      Promise.resolve({ content: '' })),
  };

  const p = new TestProvider({ github, log: createTestLog() });

  return p.getSignOffs(t.context.pr)
    .then(reviews => {
      t.true(p.getSignOffsFromFile.calledTwice);
      t.is(reviews.length, 1);
      t.deepEqual(reviews[0], { name: 'Test', logins: ['paultyng'] });
    });
});

test('FileSignOffProvider.getSignOffs - NotFoundError', t => {
  const github = {
    getContents: sinon.stub().returns(
      Promise.reject(new NotFoundError())),
  };

  const p = new TestProvider({ github, log: createTestLog() });

  return p.getSignOffs(t.context.pr)
    .then(() => {
      t.false(p.getSignOffsFromFile.called);
    });
});
