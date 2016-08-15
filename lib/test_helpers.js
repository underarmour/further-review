import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

import { defaultConfig } from './config';

function createTestConfig(data) {
  const configData = Object.assign({}, defaultConfig, data);

  function configGet(key) {
    return key
      .split(':')
      .reduce((acc, k) => (acc ? acc[k] : null), configData);
  }

  return configGet;
}

function createTestLog() {
  return {
    debug: sinon.spy(),
    info: sinon.spy(),
    warn: sinon.spy(),
    error: sinon.spy(),
  };
}

export {
  createTestLog,
  createTestConfig,
};
