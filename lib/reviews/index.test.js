import test from 'ava';

import {
  isGlobMatch,
} from '../reviews';

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
