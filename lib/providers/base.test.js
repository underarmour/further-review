import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import BaseProvider from './base';

test('BaseProvider', t => {
  class AbstractTest extends BaseProvider { }
  const at = new AbstractTest();

  t.throws(() => at.getSignOffs(), TypeError);
});

test('BaseProvider.title', t => {
  class AbstractTest extends BaseProvider { }

  const at = new AbstractTest();
  t.is(at.title, 'AbstractTest');

  const at2 = new AbstractTest({ title: 'Test Title' });
  t.is(at2.title, 'Test Title');

  class DefaultTitle extends BaseProvider {
    constructor(options) {
      super(options);
      this.defaultTitle = 'Foo';
    }
  }

  const dt = new DefaultTitle();
  t.is(dt.title, 'Foo');

  const dt2 = new DefaultTitle({ title: 'Bar' });
  t.is(dt2.title, 'Bar');
});
