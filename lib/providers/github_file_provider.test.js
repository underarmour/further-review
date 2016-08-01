import test from 'ava';
import sinon from 'sinon';
import Promise from 'bluebird';

import { NotFoundError } from '../minihub';
import { createTestLog } from '../test_helpers';
import GithubFileProvider from './github_file_provider';

const getReviewsFromFile = sinon.stub().returns(Promise.resolve());

class TestProvider extends GithubFileProvider {
  constructor(config) {
    super(config);

    this.getReviewsFromFile = getReviewsFromFile;
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

  p.getReviews('paultyng', 'further-review', 'abcd1234')
    .then(() => {
      t.true(getReviewsFromFile.calledTwice);
    });
});

test('GithubFileProvider.getReviews - NotFoundError', t => {
  const github = {
    getContents: sinon.stub().returns(
      Promise.reject(new NotFoundError())),
  };

  const p = new TestProvider({ getReviewsFromFile, github, log: createTestLog() });

  p.getReviews('paultyng', 'further-review', 'abcd1234')
    .then(() => {
      t.false(getReviewsFromFile.called);
    });
});
