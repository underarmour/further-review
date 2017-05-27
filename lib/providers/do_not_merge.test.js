import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import { default as DoNotMergeProvider } from './do_not_merge';
import { createProviderOptions } from '../test_helpers';

test.beforeEach(async t => {
  const pr = {
    owner: 'paultyng',
    repo: 'further-review',
    number: 32,
  };

  const { github } = t.context.options = createProviderOptions();
  t.context.github = github;

  const p = t.context.provider = new DoNotMergeProvider(t.context.options);
  await p.init(pr);
});

async function pullRequestTitleContains(t, input, expected) {
  t.context.github.getPullRequest = sinon.spy(async() => { return { title: input }; });

  const { success } = await t.context.provider.review();

  t.is(success, expected);
}

test.only('DoNotMergeProvider.review - title - Do Not Merge', pullRequestTitleContains, 'Do Not Merge', false);
test.only('DoNotMergeProvider.review - title - WIP', pullRequestTitleContains, 'WIP', false);
test.only('DoNotMergeProvider.review - title - wip', pullRequestTitleContains, 'wip', false);
test.only('DoNotMergeProvider.review - title - DNM', pullRequestTitleContains, 'DNM', false);
test.only('DoNotMergeProvider.review - title - dnm', pullRequestTitleContains, 'dnm', false);
test.only('DoNotMergeProvider.review - title - Non blocking phrase', pullRequestTitleContains, 'foobar', true);
test.only('DoNotMergeProvider.review - title - Leading partial blocking phrase', pullRequestTitleContains, 'notWIP', true);
test.only('DoNotMergeProvider.review - title - Surrounded blocking phrase', pullRequestTitleContains, 'notWIPphrase', true);
