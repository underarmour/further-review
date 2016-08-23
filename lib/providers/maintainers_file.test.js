import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import MaintainersFileProvider from './maintainers_file';
import { createTestLog } from '../test_helpers';

const provider = new MaintainersFileProvider({ required: 2, log: createTestLog() });

const MAINTAINERS_FILE = `Paul Tyng <paul@example.com> (@paultyng1)
paultyng2 <paul@example.com>
# comment

paultyng3
`;

test('MaintainersFileProvider.getFilepaths', async t => {
  const paths = await provider.getFilePaths();

  t.deepEqual(paths, ['MAINTAINERS']);
});

test('MaintainersFileProvider - MAINTAINERS', async t => {
  const reviews = provider
    .getReviewsFromFile('owner', 'repo', 'sha', MAINTAINERS_FILE);

  t.deepEqual(reviews, [{
    id: 'MAINTAINERS-file',
    name: 'MAINTAINERS file',
    required: 2,
    logins: ['paultyng1', 'paultyng2', 'paultyng3'],
  }]);
});
