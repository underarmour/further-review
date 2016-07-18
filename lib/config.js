import nconf from 'nconf';

let conf = nconf
  .env({
    separator: '__',
    lowerCase: true,
  });

if (!process.env.APEX_FUNCTION_NAME) {
  conf = conf.file('config.json');
}

conf = conf
  .defaults({
    port: 3000,
    github: {
      // Public github
      base_url: 'https://api.github.com/',
    },
    review: {
      // Off by default
      dynamodb: false,
      repo_collaborators: false,
      package_json_file: true,
      maintainers_file: true,
    },
  });

const configGet = conf.get.bind(conf);

export { configGet as default };
