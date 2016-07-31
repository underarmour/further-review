// Review sources
/* eslint-disable camelcase */
import dynamodb from './dynamodb';
import package_json_file from './package_json_file';
import maintainers_file from './maintainers_file';
import repo_collaborators from './repo_collaborators';
import further_review_file from './further_review_file';
/* eslint-enable camelcase */

const installedProviders = {
  dynamodb,
  package_json_file,
  maintainers_file,
  repo_collaborators,
  further_review_file,
};

export {
  installedProviders as default,
};
