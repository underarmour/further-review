import test from 'ava';
import Promise from 'bluebird';

import MaintainersFileProvider from './maintainers_file';
import { createTestLog } from '../test_helpers';

const provider = new MaintainersFileProvider({ required: 2, log: createTestLog() });

const MAINTAINERS_FILE = `Paul Tyng <paul@example.com> (@paultyng1)
paultyng2 <paul@example.com>
# comment

paultyng3
`;

test('MaintainersFileProvider.getFilepaths', t => {
  return Promise.resolve(provider.getFilePaths())
    .then(paths => t.deepEqual(paths, ['MAINTAINERS']));
});

test('MaintainersFileProvider - MAINTAINERS', t => {
  return Promise.resolve(provider.getReviewsFromFile('owner', 'repo', 'sha', MAINTAINERS_FILE))
    .then(reviews => t.deepEqual(reviews, [{
      name: 'MAINTAINERS file',
      required: 2,
      logins: ['paultyng1', 'paultyng2', 'paultyng3'],
    }]));
});
