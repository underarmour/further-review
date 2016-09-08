import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import {
  url,
  arrayDifference,
  dedent,
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

test('dedent - template tag', t => {
  t.is(dedent`
    this
      is
  the ${'end'}
        my only
    friend
the end
  `, '\nthis\n  is\nthe end\n    my only\nfriend\nthe end\n');
});

test('dedent - higher order template tag', t => {
  t.is(dedent(String.raw)`
    this
      is
  the ${'end'}
        my only
    friend
the \end
  `, '\nthis\n  is\nthe end\n    my only\nfriend\nthe \\end\n');
});

test('dedent - template tag empty replacements', t => {
  t.is(dedent`
    ### ${'Repo Collaborators'}
    ${''}

    ${'* @kjvalencik'}

    ${''}
  `, '\n### Repo Collaborators\n\n\n* @kjvalencik\n\n\n');
});
