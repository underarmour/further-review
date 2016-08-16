import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import { url } from './minihub';

test('url escaping', t => {
  t.is(url`/root/${'test'}/blah`, '/root/test/blah', 'simple');
  t.is(url`/root/${'sp ace'}/blah`, '/root/sp%20ace/blah', 'escaping');
  t.is(url`${'noprefix'}/stuff`, 'noprefix/stuff', 'no prefix');
  t.is(url`/root/${'nosuffix'}`, '/root/nosuffix', 'no suffix');
});
