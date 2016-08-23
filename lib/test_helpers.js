import sinon from 'sinon'; // eslint-disable-line import/no-extraneous-dependencies

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

export {
  createTestLog,
  createTestConfig,
};
