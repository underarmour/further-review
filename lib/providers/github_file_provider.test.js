import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import { NotFoundError } from '../minihub';
import { createTestLog } from '../test_helpers';
import GithubFileProvider from './github_file_provider';

test('Abstract', t => {
  class AbstractTest extends GithubFileProvider { }
  const at = new AbstractTest();

  t.throws(at.getFilePaths(), TypeError);
  t.throws(at.getReviewsFromFile(), TypeError);
});

class TestProvider extends GithubFileProvider {
  constructor(config) {
    super(config);

    this.getReviewsFromFile = sinon
      .stub();

    this.getReviewsFromFile
      .onFirstCall()
      .returns(Promise.resolve([]))

      .onSecondCall()
      .returns(Promise.resolve([{ name: 'Test', logins: ['paultyng'] }]));
  }

  async getFilePaths() {
    return ['file1.js', 'file2.js'];
  }
}

test('GithubFileProvider.getReviews', t => {
  const github = {
    getContents: sinon.stub().returns(
      Promise.resolve({ content: '' })),
  };

  const p = new TestProvider({ github, log: createTestLog() });

  return p.getReviews('paultyng', 'further-review', 'abcd1234')
    .then(reviews => {
      t.true(p.getReviewsFromFile.calledTwice);
      t.is(reviews.length, 1);
      t.deepEqual(reviews[0], { name: 'Test', logins: ['paultyng'] });
    });
});

test('GithubFileProvider.getReviews - NotFoundError', t => {
  const github = {
    getContents: sinon.stub().returns(
      Promise.reject(new NotFoundError())),
  };

  const p = new TestProvider({ github, log: createTestLog() });

  return p.getReviews('paultyng', 'further-review', 'abcd1234')
    .then(() => {
      t.false(p.getReviewsFromFile.called);
    });
});
