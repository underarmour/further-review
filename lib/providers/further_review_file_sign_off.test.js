import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import FurtherReviewFileSignOffProvider from './further_review_file_sign_off';
import { createTestLog } from '../test_helpers';

const file = 'test.yml';
const provider = new FurtherReviewFileSignOffProvider({ file, log: createTestLog() });

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

test('FurtherReviewFileSignOffProvider.getFilepaths', async t => {
  const paths = await provider.getFilePaths();

  t.deepEqual(paths, [file]);
});

test('FurtherReviewFileSignOffProvider - simple yaml', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', TEST_YAML);

  t.deepEqual(reviews, [{
    id: 'further-review-file-0',
    name: 'Test',
    required: 2,
    description: 'Some description',
    glob: 'package.json',
    logins: ['paultyng1', 'paultyng2', 'paultyng3'],
  }]);
});

test('FurtherReviewFileSignOffProvider - no logins', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', NO_LOGINS_YAML);

  t.deepEqual(reviews, []);
});

test('FurtherReviewFileSignOffProvider - no reviews', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', 'somekey: somevalue');

  t.deepEqual(reviews, []);
});

test('FurtherReviewFileSignOffProvider - bad yaml', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', 'DSLFKJ: DLKFJ: DLFKJ: {{{{');

  t.deepEqual(reviews, []);
});
