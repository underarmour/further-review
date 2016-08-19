import nconf from 'nconf';

let conf = nconf
  .env({
    separator: '__',
    lowerCase: true,
  });

if (!process.env.APEX_FUNCTION_NAME) {
  conf = conf.file('config.json');
}

const defaultConfig = {
  port: 3000,
  github: {
    // Public github
    base_url: 'https://api.github.com/',
  },
  signoff_regex: '(\\bLGTM\\b|:\\+1:|:shipit:)',
  signoff_regex_options: 'i',
  review: {
    // Off by default
    dynamodb: false,
    repo_collaborators: false,

    // On by default
    package_json_file: true,
    maintainers_file: true,
    further_review_file: true,
  },
  comment: {
    footer: '\n\n---\nTo sign-off on a PR once you are mentioned, leave a comment with `LGTM`, `:+1:` or `:ship_it:`.\n\n*This comment was left by the [Further Review](https://github.com/paultyng/further-review) PR review app.*',
  },
};

conf = conf
  .defaults(defaultConfig);

const configGet = conf.get.bind(conf);

export {
  configGet as default,
  defaultConfig,
};
