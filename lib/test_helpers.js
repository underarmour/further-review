import sinon from 'sinon';

function createTestConfig(data) {
  function configGet(key) {
    return key
      .split(':')
      .reduce((acc, k) => (acc ? acc[k] : null), data);
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
