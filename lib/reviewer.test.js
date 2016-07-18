import test from 'ava';
import Promise from 'bluebird';

import {
  getMentions,
  getSignOffs,
} from './reviewer';

const SelfLogin = 'further-review';

function stubParams(comments) {
  return {
    github: {
      getCurrentUser: () => Promise.resolve({ login: SelfLogin }),
      getIssueComments: () => Promise.resolve(comments),
    },
    owner: 'paultyng',
    repo: 'further-review',
    login: SelfLogin,
  };
}

test('getMentions', t => {
  return getMentions(stubParams([
    '@BeGinning @middle @END',
    '@twice',
    '@twice',
    '\n@Chars-1-2-3\n@newlines\n',
  ].map(body => ({ user: { login: SelfLogin }, body_text: body }))))
  .then(mentions => {
    t.deepEqual(mentions, [
      'beginning',
      'chars-1-2-3',
      'end',
      'middle',
      'newlines',
      'twice',
    ]);
  });
});

test('getSignOffs', t => {
  return getSignOffs(stubParams([
    { user: { login: 'paultyngno' }, body_text: 'just a comment' },
    { user: { login: SelfLogin }, body_text: 'LGTM' },
    { user: { login: 'paultyngyes' }, body_text: 'Yeah, this LGTM' },
  ]))
  .then(signOffs => t.deepEqual(signOffs, ['paultyngyes']));
});
