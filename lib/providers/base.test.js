import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import BaseProvider from './base';

test('Abstract', t => {
  class AbstractTest extends BaseProvider { }
  const at = new AbstractTest();

  t.throws(() => at.getSignOffs(), TypeError);
});
