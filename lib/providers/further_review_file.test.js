import test from 'ava';
import Promise from 'bluebird';

import FurtherReviewFileProvider from './further_review_file';
import { createTestLog } from '../test_helpers';

const provider = new FurtherReviewFileProvider({ file: 'test.yml', log: createTestLog() });

const TEST_YAML = `
ignoreThis: just a test
reviews:
  - name: Test
    logins:
      - paultyng1
      - paultyng2 <paul@example.com>
      - Paul Tyng <paul@example.com> (@paultyng3)
    glob: package.json
    required: 2
`;

const NO_LOGINS_YAML = `
reviews:
  - name: 'Null'
    logins:
  - name: Empty Array
    logins: []
`;

test('FurtherReviewFileProvider - simple yaml', t => {
  return Promise.resolve(provider.getReviewsFromFile('owner', 'repo', 'sha', TEST_YAML))
    .then(reviews => t.deepEqual(reviews, [{
      name: 'Test',
      required: 2,
      glob: 'package.json',
      logins: ['paultyng1', 'paultyng2', 'paultyng3'],
    }]));
});

test('FurtherReviewFileProvider - no logins', t => {
  return Promise.resolve(provider.getReviewsFromFile('owner', 'repo', 'sha', NO_LOGINS_YAML))
    .then(reviews => t.deepEqual(reviews, []));
});
