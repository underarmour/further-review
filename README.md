# (Upon) Further Review

[![Build Status](https://travis-ci.org/paultyng/further-review.svg?branch=master)](https://travis-ci.org/paultyng/further-review) [![Coverage Status](https://coveralls.io/repos/github/paultyng/further-review/badge.svg?branch=master)](https://coveralls.io/github/paultyng/further-review?branch=master)

**Further Review** enforces glob based code reviews on PRs.

* [Getting Started](#getting-started)
* [How it works](doc/how-it-works.md)
* [Providers](doc/providers.md)
* [Watch / Subscriptions only](#using-for-glob-based-watch--subscriptions)

## Getting Started

There are a number of ways to use Further Review with your repo, but the easiest is to just add a **.further-review.yml** file similar to this example:

```yaml
reviews:
  - name: Package.json Maintainers
    # List of GitHub usernames
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

Given the file above, when a new PR is submitted, at least one of **user1** or **user2** will need to sign off due to the `General Maintainers` rule, and if the PR touches the **package.json** file, **paultyng** would also need to sign off.

### Installation

#### Docker

Coming soon...

#### Lambda

This application uses [Apex](http://apex.run) to run on AWS Lambda.  To deploy on Lambda:

1. Create an **env.json** file (`GITHUB_BASE_URL` defaults to public GitHub):

  ```json
  {
    "GITHUB_TOKEN": "YOUR TOKEN HERE",
    "GITHUB_BASE_URL": "https://api.github.com/"
  }
  ```

1. Run `apex deploy -e env.json`

### Additional Setup

#### Protecting the Branch

Further Review works best when the `master` branch is protected until it reviews the PR.  You can set this up in GitHub settings for the repo.

![Protecting the master branch](doc/img/protect-branch.png)

#### Setting up the Webhooks

A webhook should be configured in GitHub with the following events:

* Issue comment
* Pull request
* Pull request review comment

## Using for Glob based Watch / Subscriptions

To just subscribe to files for notification but not be required for review, you can add a targeted review with zero required sign-offs.
