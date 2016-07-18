class LogProxy {
  error(...args) {
    console.error(...args); // eslint-disable-line no-console
  }

  warn(...args) {
    console.warn(...args); // eslint-disable-line no-console
  }

  info(...args) {
    console.info(...args); // eslint-disable-line no-console
  }

  debug(...args) {
    console.info(...args); // eslint-disable-line no-console
  }
}

const defaultLogProxy = new LogProxy();

export {
  defaultLogProxy as default,
  LogProxy as Log,
};
