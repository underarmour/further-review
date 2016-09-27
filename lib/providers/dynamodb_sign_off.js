import AWS from 'aws-sdk';
import Promise from 'bluebird';

import SignOffProvider from './sign_off';

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

class DynamoDbSignOffProvider extends SignOffProvider {
  constructor(options = {}) {
    super(options);

    this.dynamodb = options.dynamodb || new AWS.DynamoDB({ apiVersion: '2011-12-05' });
    Promise.promisifyAll(this.dynamodb);

    const TableName = this.tableName = options.table || 'FurtherReview';

    this.table = Object.assign({}, DefaultTable, { TableName });
  }

  async runCreateTable() {
    let table = await this.dynamodb.describeTableAsync({
      TableName: this.tableName,
    });

    if (!table) {
      table = await this.dynamodb.createTableAsync(this.table);
    }
  }

  createTable() {
    if (!this.tableCreatedPromise) {
      this.tableCreatedPromise = this.runCreateTable();
    }

    return this.tableCreatedPromise;
  }

  async query(params) {
    const { Items: items } = await this.dynamodb.queryAsync(params);

    return items.map(item =>
        Object.entries(item)
          .reduce((m, [k, tv]) => {
            const v = Object.values(tv)[0];
            m[k] = v;
            return m;
          }, {}));
  }

  async getSignOffs() {
    const { owner } = this.pr;
    const signOffs = await this.query({
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
    });

    signOffs.forEach(r => {
      // normalize record
      r.id = `dynamodb-${r.owner}-${r.name}`;
      r.logins = r.logins.map(l => l.toLowerCase());
      r.required = r.required || 1;
    });

    return signOffs;
  }
}

export {
  DynamoDbSignOffProvider as default,
};
