import test from 'ava';
import Promise from 'bluebird';

import PackageJsonFileProvider from './package_json_file';

const provider = new PackageJsonFileProvider({ required: 2 });
provider.self = {
  html_url: 'https://github.com/further-review',
};

const PACKAGE_JSON_FILE = JSON.stringify({
  maintainers: [
    'Paul Tyng <paul@example.com> (https://github.com/paultyng1)',
    'Paul Tyng <paul@example.com> (@paultyng2)',
  ],
});

test('PackageJsonFileProvider - package.json', t => {
  return Promise.resolve(provider.getReviewsFromFile('owner', 'repo', 'sha', PACKAGE_JSON_FILE))
    .then(reviews => t.deepEqual(reviews, [{
      name: 'package.json file',
      required: 2,
      logins: ['paultyng1', 'paultyng2'],
    }]));
});

test('PackageJsonFileProvider - package.json no maintainers', t => {
  return Promise.resolve(provider.getReviewsFromFile('owner', 'repo', 'sha', '{}'))
    .then(reviews => t.deepEqual(reviews, []));
});
