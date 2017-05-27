import nconf from 'nconf';

let conf = nconf
  .env({
    separator: '__',
    lowerCase: true,
  });

if (!process.env.APEX_FUNCTION_NAME) {
  conf = conf.file(process.env.FR_CONFIG_FILE || 'config.json');
}

const defaultConfig = {
  port: 3000,
  github: {
    // Public github
    base_url: 'https://api.github.com/',
  },
  review: {
    // Default configs for all reviews
    defaults: {
      approval_comment_regex: '(\\bLGTM\\b|:\\+1:|:shipit:)',
      approval_comment_regex_options: 'i',
      do_not_merge_comment_regex: '\\b(wip|do not merge|dnm)\\b',
      do_not_merge_comment_regex_options: 'i',
    },

    // Off by default
    dynamodb_sign_off: false,
    repo_collaborators_sign_off: false,

    // On by default
    package_json_file_sign_off: true,
    maintainers_file_sign_off: true,
    further_review_file_sign_off: true,
    do_not_merge: true,
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
