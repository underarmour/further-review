import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import {
  url,
  arrayDifference,
  isGlobMatch,
} from './common';

test('url escaping', t => {
  t.is(url`/root/${'test'}/blah`, '/root/test/blah', 'simple');
  t.is(url`/root/${'sp ace'}/blah`, '/root/sp%20ace/blah', 'escaping');
  t.is(url`${'noprefix'}/stuff`, 'noprefix/stuff', 'no prefix');
  t.is(url`/root/${'nosuffix'}`, '/root/nosuffix', 'no suffix');
});

test('arrayDifference', t => {
  t.deepEqual(arrayDifference([], []), []);
  t.deepEqual(arrayDifference([], [1]), []);
  t.deepEqual(arrayDifference([1], []), [1]);
  t.deepEqual(arrayDifference([1], [1]), []);
});

test('isGlobMatch - matches file set', t => {
  const files = ['package.json'];
  const glob = 'package.json';

  t.true(isGlobMatch(files, glob));
});

test('isGlobMatch - does not match file set', t => {
  const files = ['Dockerfile'];
  const glob = 'package.json';

  t.false(isGlobMatch(files, glob));
});

test('isGlobMatch - complex match', t => {
  const files = ['Dockerfile', 'schema/deploy.yaml', 'index.js'];
  const glob = '{package.json,schema/**/*.{yaml,yml}}';

  t.true(isGlobMatch(files, glob));
});
