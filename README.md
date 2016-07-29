# (Upon) Further Review

**Further Review** enforces glob based code reviews on PRs.

* [Getting Started](#getting-started)
* [How it works](doc/how-it-works.md)
* [Providers](doc/providers.md)
* [Watch / Subscriptions only](#using-for-glob-based-watch--subscriptions)

## Getting Started

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
