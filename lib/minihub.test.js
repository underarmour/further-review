import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import { createTestLog } from './test_helpers';
import { MiniHub, NotFoundError } from './minihub';

test('Link header parsing', async t => {
  const mh = new MiniHub({
    log: createTestLog(),
  });

  // TODO: use sinon for xhr here?
  // stub axios
  mh.axios = {
    request: async () => ({
      headers: {
        Link: '<https://example.com?page=1>; rel="previous"',
      },
      data: [3, 4],
    }),
  };

  const { data } = await mh.handleLinkHeader({ url: 'https://example.com/?page=1' }, {
    headers: {
      Link: '<https://example.com?page=2>; rel="next"',
    },
    data: [1, 2],
  });

  // TODO: use spies, inspect second request url, etc
  t.deepEqual(data, [1, 2, 3, 4]);
});

test('NotFoundError thrown', async t => {
  const mh = new MiniHub({
    log: createTestLog(),
  });

  class TestError {
    get response() {
      return { status: 404 };
    }
  }

  // TODO: use sinon for xhr here?
  // stub axios
  mh.axios = {
    request: async () => {
      throw new TestError();
    },
  };

  t.throws(mh.request({ url: 'https://example.com' }), NotFoundError);
});
