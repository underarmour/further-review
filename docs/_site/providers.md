# Review Providers

Each review provider returns the following data inputs for each review:

* `name` - the name of the review (display only)
* `logins` - an array of GitHub logins that sign off for this review
* `glob` (optional, default: all files) - the glob of files to match (this uses the [minimatch](https://www.npmjs.com/package/minimatch) package)
* `required` (optional, default `1`) - the number of logins required to sign off for this review to be satisfied

## Further Review file

Maintainers are specified in the standard Further Review file format. The default file name is **.further-review.yml**, but the file name is configurable.

The YAML file takes the following format:

```yaml
reviews:
  - name: Package.json Maintainers
    logins:
      # All three of the following formats are supported:
      - paultyng
      - paultyng <paul@example.com>
      - Paul Tyng <paul@example.com> (@paultyng)
    # Optional glob to match on
    glob: package.json
    # Number of required sign offs
    required: 1
  # Multiple reviews can be listed.
  - name: General Maintainers
    logins:
      - user1
      - user2
```

### Configuration

```js
  {
    "file": "file1.yml,file2.yaml", // name of the YAML file
  }
```

## `package_json_file`

Maintainers will be imported from the **package.json** of an NPM project if it has a `maintainers` section that has a url in one of the following formats:

* `https://github.com/paultyng`
* `@paultyng`

### Configuration

```js
  {
    name: 'package.json file', // name of the review
    required: 1, // number of reviews required
  }
```

## `maintainers_file`

Maintainers will be imported from the **MAINTAINERS** file if present where each line is in one of the formats:

* `paultyng`
* `paultyng <paul@example.com>`
* `Paul Tyng <paul@example.com> (@paultyng)`

### Configuration

```js
  {
    name: 'MAINTAINERS file', // name of the review
    required: 1, // number of reviews required
  }
```

## `repo_collaborators`

The list of collaborators on the repo returned from the [Github API](https://developer.github.com/v3/repos/collaborators/#list-collaborators).

### Configuration

```js
  {
    name: 'Repo Collaborators', // name of the review
    required: 1, // number of reviews required
  }
```

## `dynamodb`

### Configuration

```js
  {
    table: 'FurtherReview', // Dynamo DB table name
  }
```

A custom DynamoDb table used to store review specifications.  This is useful when Further Review is run from Lambda.
