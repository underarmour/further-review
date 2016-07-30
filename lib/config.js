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
  review: {
    // Off by default
    dynamodb: false,
    repo_collaborators: false,

    // On by default
    package_json_file: true,
    maintainers_file: true,
    further_review_file: true,
  },
};

conf = conf
  .defaults(defaultConfig);

const configGet = conf.get.bind(conf);

export {
  configGet as default,
  defaultConfig,
};
