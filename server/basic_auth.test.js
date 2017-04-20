import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies
import bcrypt from 'bcrypt';

import basicAuth from './basic_auth';

class MockRequest {
  constructor(headers = {}) {
    this.headers = headers;
  }

  get(key) {
    return this.headers[key];
  }
}

class MockResponse {
  constructor(reject) {
    this.code = 200;
    this.reject = reject;
  }

  status(code) {
    this.code = code;

    return this;
  }

  send(message) {
    this.reject(Object.assign(new Error(message), { code: this.code }));
  }
}

function getBasicAuth(users) {
  const mw = basicAuth(users);

  return req => new Promise((resolve, reject) => {
    const res = new MockResponse(reject);
    const next = err => (err ? reject(err) : resolve(err));

    mw(req, res, next);
  });
}

test('basicAuth - should pass', async (t) => {
  const username = 'github';
  const password = 'my password';
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  const mw = getBasicAuth({
    enabled: true,
    users: { [username]: await bcrypt.hash(password, 10) },
  });

  const res = await mw(new MockRequest({ Authorization: `Basic ${encoded}` }));

  t.is(res, undefined);
});

test('basicAuth - should fail', async (t) => {
  const username = 'github';
  const password = 'my password';
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  const mw = getBasicAuth({
    enabled: true,
    users: { [username]: await bcrypt.hash('correct', 10) },
  });

  try {
    await mw(new MockRequest({ Authorization: `Basic ${encoded}` }));

    throw new Error('should not run');
  } catch ({ code }) {
    t.is(code, 401);
  }
});

test('basicAuth - should allow all if not enabled', async (t) => {
  const mw = getBasicAuth();
  const req = new MockRequest();

  const res = await mw(req);

  t.is(res, undefined);
});
