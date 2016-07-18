import AWS from 'aws-sdk';
import Promise from 'bluebird';

import Provider from '../provider';

const DefaultTable = {
  KeySchema: {
    HashKeyElement: {
      AttributeName: 'owner',
      AttributeType: 'S',
    },
    RangeKeyElement: {
      AttributeName: 'name',
      AttributeType: 'S',
    },
  },
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
  // Set below: TableName: 'FurtherReview',
};

class DynamoDbProvider extends Provider {
  constructor(config = {}) {
    super(config);

    this.dynamodb = config.dynamodb || new AWS.DynamoDB({ apiVersion: '2011-12-05' });
    Promise.promisifyAll(this.dynamodb);

    const TableName = this.tableName = config.table || 'FurtherReview';
    this.table = Object.assign({}, DefaultTable, { TableName });
  }

  createTable() {
    if (!this.tableCreatedPromise) {
      this.tableCreatedPromise = this.dynamodb.describeTableAsync({
        TableName: this.tableName,
      })
        .tap(t => {
          if (!t) {
            return this.dynamodb.createTableAsync(t);
          }

          return undefined;
        })
        .tap(() => this.tableCreated = true) // eslint-disable-line no-return-assign
        .then(() => true);
    }

    return this.tableCreatedPromise;
  }

  query(params) {
    return this.createTable()
      .then(() => this.dynamodb.queryAsync(params))
      .get('Items')
      // TODO: handle last evaluated key...
      .map(item =>
        Object.entries(item)
          .reduce((m, [k, tv]) => {
            const v = Object.values(tv)[0];
            m[k] = v;
            return m;
          }, {}));
  }

  getReviews(owner, repo, _sha) {
    return this.query({
      TableName: this.tableName,
      AttributesToGet: [
        'name',
        'glob',
        'logins',
        'required',
      ],
      Limit: 1000,
      ConsistentRead: false,
      Count: false,
      HashKeyValue: {
        S: owner,
      },
    })
    .each(r => {
      // normalize record
      r.logins = r.logins.map(l => l.toLowerCase());
      r.required = r.required || 1;
    });
  }
}

export {
  DynamoDbProvider as default,
};
