import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import parseLogin from './parse_login';

test('Supported Formats', t => {
  const formats = {
    'paultyng': 'paultyng', // eslint-disable-line quote-props
    'paultyng <paul@example.com>': 'paultyng',
    'Paul Tyng <paul@example.com> (@paultyng)': 'paultyng',
    'Paul Tyng (@paultyng)': 'paultyng',
    '': null,
  };

  Object
    .keys(formats)
    .forEach(format => t.is(parseLogin(format), formats[format], format));
});
