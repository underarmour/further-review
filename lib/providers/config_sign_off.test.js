import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import ConfigSignOffProvider from './config_sign_off';

test('ConfigSignOffProvider - should transform config', async (t) => {
  const config = key => (key !== 'review:config_sign_off' ? undefined : [{
    name: 'Platform Review',
    dependencyAdded: true,
    required: 2,
    logins: ['UPPER'],
  }]);

  const provider = new ConfigSignOffProvider({ config });

  const signOffs = await provider.getSignOffs();

  t.deepEqual(signOffs, [{
    name: 'Platform Review',
    dependencyAdded: true,
    required: 2,
    logins: ['upper'],
    id: 'config-Platform Review',
  }]);
});

test('ConfigSignOffProvider - should default required', async (t) => {
  const config = key => (key !== 'review:config_sign_off' ? undefined : [{}]);
  const provider = new ConfigSignOffProvider({ config });

  const [signOff] = await provider.getSignOffs();

  t.is(signOff.required, 1);
});
