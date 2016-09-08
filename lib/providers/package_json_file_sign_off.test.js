import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import PackageJsonFileSignOffProvider from './package_json_file_sign_off';
import { createTestLog } from '../test_helpers';

const provider = new PackageJsonFileSignOffProvider({ required: 2, log: createTestLog() });
provider.self = {
  html_url: 'https://github.com/further-review',
};

const PACKAGE_JSON_FILE = JSON.stringify({
  maintainers: [
    'Paul Tyng <paul@example.com> (https://github.com/paultyng1)',
    'Paul Tyng <paul@example.com> (@paultyng2)',
    'No Login',
  ],
});

test('PackageJsonFileSignOffProvider - getFilePaths', async t => {
  const paths = await provider.getFilePaths();

  t.deepEqual(paths, ['package.json']);
});

test('PackageJsonFileSignOffProvider - package.json', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', PACKAGE_JSON_FILE);

  t.deepEqual(reviews, [{
    id: 'package.json-file',
    name: 'package.json file',
    required: 2,
    logins: ['paultyng1', 'paultyng2'],
  }]);
});

test('PackageJsonFileSignOffProvider - malformed package.json', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', 'THIS{ISA(BADJSON"FILE');

  t.deepEqual(reviews, []);
});

test('PackageJsonFileSignOffProvider - package.json no maintainers', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', '{}');

  t.deepEqual(reviews, []);
});
