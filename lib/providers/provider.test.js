import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import ReviewProvider from './provider';

test('Abstract', t => {
  class AbstractTest extends ReviewProvider { }
  const at = new AbstractTest();

  t.throws(at.getReviews(), TypeError);
});
