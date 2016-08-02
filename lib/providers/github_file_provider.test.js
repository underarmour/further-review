import test from 'ava';
import sinon from 'sinon';
import Promise from 'bluebird';

import { NotFoundError } from '../minihub';
import { createTestLog } from '../test_helpers';
import GithubFileProvider from './github_file_provider';

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

  getFilePaths() {
    return Promise.resolve(['file1.js', 'file2.js']);
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
