import test from 'ava'; // eslint-disable-line import/no-extraneous-dependencies

import { flattenDynamoItem } from './dynamodb_sign_off';

test('flattenDynamoItem - nested item', t => {
  const data = {
    boolTest: { BOOL: true },
    stringTest: { S: 'foo' },
    stringArrayTest: { SS: ['one', 'two'] },
    mapTest: { M: { mapKeyTest: { S: 'bar' } } },
    numberTest: { N: '1' },
  };

  const expected = {
    boolTest: true,
    stringTest: 'foo',
    stringArrayTest: ['one', 'two'],
    mapTest: { mapKeyTest: 'bar' },
    numberTest: 1,
  };

  const actual = flattenDynamoItem(data);

  t.deepEqual(actual, expected);
});
