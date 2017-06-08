import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import DoNotMergeProvider from './do_not_merge';
import { createProviderOptions } from '../test_helpers';

test.beforeEach(async t => {
  const pr = {
    owner: 'paultyng',
    repo: 'further-review',
    number: 32,
  };

  t.context.sandbox = sinon.sandbox.create();

  const { github } = t.context.options = createProviderOptions();
  t.context.github = github;

  const p = t.context.provider = new DoNotMergeProvider(t.context.options);
  await p.init(pr);
});

test.afterEach(t => {
  t.context.sandbox.restore();
});

async function pullRequestTitleContains(t, input, expected) {
  t.context.github.getPullRequest = t.context.sandbox.spy(async() => ({ title: input }));

  const { success, comment } = await t.context.provider.review();

  t.is(!comment, expected);
  t.is(success, expected);
}

test('DoNotMergeProvider.review - title - Do Not Merge', pullRequestTitleContains, 'Do Not Merge', false);
test('DoNotMergeProvider.review - title - WIP', pullRequestTitleContains, 'WIP', false);
test('DoNotMergeProvider.review - title - wip', pullRequestTitleContains, 'wip', false);
test('DoNotMergeProvider.review - title - DNM', pullRequestTitleContains, 'DNM', false);
test('DoNotMergeProvider.review - title - dnm', pullRequestTitleContains, 'dnm', false);
test('DoNotMergeProvider.review - title - Non blocking phrase', pullRequestTitleContains, 'foobar', true);
test('DoNotMergeProvider.review - title - Leading partial blocking phrase', pullRequestTitleContains, 'notWIP', true);
test('DoNotMergeProvider.review - title - Surrounded blocking phrase', pullRequestTitleContains, 'notWIPphrase', true);
