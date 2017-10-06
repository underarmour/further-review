import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import { parseTeamSpecifier } from './get_team_membership';


test('Team Specifier', t => {
  const formats = {
    'test/sample': { org: 'test', team: 'sample' },
    'test/Multiple Words': { org: 'test', team: 'Multiple Words' },
  };

  Object
    .keys(formats)
    .forEach(format => t.deepEqual(parseTeamSpecifier(format), formats[format], format));
});

test.todo('Get Team Id');
test.todo('Get Team Membership');
