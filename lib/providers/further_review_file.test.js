import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

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
    description: Some description
    required: 2
`;

const NO_LOGINS_YAML = `
reviews:
  - name: 'Null'
    logins:
  - name: Empty Array
    logins: []
`;

const DESCRIPTION_FALLBACK = `
reviews:
  - name: 'Test'
    logins: ['abc']
    glob: 'fallback'
`;

test('FurtherReviewFileProvider - simple yaml', async t => {
  const reviews = await provider
    .getReviewsFromFile('owner', 'repo', 'sha', TEST_YAML);

  t.deepEqual(reviews, [{
    id: 'further-review-file-0',
    name: 'Test',
    required: 2,
    description: 'Some description',
    glob: 'package.json',
    logins: ['paultyng1', 'paultyng2', 'paultyng3'],
  }]);
});

test('FurtherReviewFileProvider - no logins', async t => {
  const reviews = await provider
    .getReviewsFromFile('owner', 'repo', 'sha', NO_LOGINS_YAML);

  t.deepEqual(reviews, []);
});

test('FurtherReviewFileProvider - description glob fallback', async t => {
  const [{ description }] = await provider
    .getReviewsFromFile('owner', 'repo', 'sha', DESCRIPTION_FALLBACK);

  t.is(description, 'fallback');
});
