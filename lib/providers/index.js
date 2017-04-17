// Review sources
/* eslint-disable camelcase */
import config_sign_off from './config_sign_off';
import dynamodb_sign_off from './dynamodb_sign_off';
import package_json_file_sign_off from './package_json_file_sign_off';
import maintainers_file_sign_off from './maintainers_file_sign_off';
import repo_collaborators_sign_off from './repo_collaborators_sign_off';
import further_review_file_sign_off from './further_review_file_sign_off';
/* eslint-enable camelcase */

const installedProviders = {
  config_sign_off,
  dynamodb_sign_off,
  package_json_file_sign_off,
  maintainers_file_sign_off,
  repo_collaborators_sign_off,
  further_review_file_sign_off,
};

export {
  installedProviders as default,
};
