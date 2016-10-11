import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies
import Promise from 'bluebird';

import { MiniHub, NotFoundError } from './minihub';
import { defaultConfig } from './config';

const SelfLogin = 'further-review-bot';

function createTestConfig(data) {
  function configGet(key) {
    return key
      .split(':')
      .reduce((acc, k) => (acc ? acc[k] : null), data);
  }

  return configGet;
}

function createTestLog(useConsole = false) {
  return {
    /* eslint-disable no-console */
    debug: sinon.spy(useConsole ? console.log : undefined),
    info: sinon.spy(useConsole ? console.info : undefined),
    warn: sinon.spy(useConsole ? console.warn : undefined),
    error: sinon.spy(useConsole ? console.error : undefined),
    /* eslint-enable no-console */
  };
}

function createTestGithub() {
  const github = sinon.createStubInstance(MiniHub);

  github.getCurrentUser
    .returns(Promise.resolve({ login: SelfLogin }));

  github.getPullRequestFiles
    .returns(Promise.resolve([]));

  ['createStatus', 'createComment', 'deleteComment']
    .forEach(n => github[n].returns(Promise.resolve()));

  ['getContents']
    .forEach(n => {
      github[n] = sinon.spy(async() => { throw new NotFoundError(); });
    });

  return github;
}

function createProviderOptions(providerOptions) {
  return Object.assign({
    config: createTestConfig(defaultConfig),
    log: createTestLog(),
    github: createTestGithub(),
  }, providerOptions);
}

export {
  createTestLog,
  createTestConfig,
  createTestGithub,
  createProviderOptions,

  SelfLogin,
};
