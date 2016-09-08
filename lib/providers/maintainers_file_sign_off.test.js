import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import MaintainersFileSignOffProvider from './maintainers_file_sign_off';
import { createTestLog } from '../test_helpers';

const provider = new MaintainersFileSignOffProvider({ required: 2, log: createTestLog() });

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
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', MAINTAINERS_FILE);

  t.deepEqual(reviews, [{
    id: 'MAINTAINERS-file',
    name: 'MAINTAINERS file',
    required: 2,
    logins: ['paultyng1', 'paultyng2', 'paultyng3'],
  }]);
});

test('MaintainersFileProvider - MAINTAINERS empty', async t => {
  const reviews = await provider
    .getSignOffsFromFile('owner', 'repo', 'sha', '');

  t.deepEqual(reviews, []);
});
