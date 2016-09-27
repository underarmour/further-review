class LogProxy {
  error(...args) {
    /* istanbul ignore next */
    console.error(...args); // eslint-disable-line no-console
  }

  warn(...args) {
    /* istanbul ignore next */
    console.warn(...args); // eslint-disable-line no-console
  }

  info(...args) {
    /* istanbul ignore next */
    console.info(...args); // eslint-disable-line no-console
  }

  debug(...args) {
    /* istanbul ignore next */
    console.info(...args); // eslint-disable-line no-console
  }
}

const defaultLogProxy = new LogProxy();

export {
  defaultLogProxy as default,
  LogProxy as Log,
};
