import yaml from 'js-yaml';

import globSignOffMixin from './glob_sign_off_mixin';
import FileSignOffProvider from './file_sign_off';
import parseLogin from '../parse_login';

class FurtherReviewFileSignOffProvider extends globSignOffMixin(FileSignOffProvider) {
  async getFilePaths() {
    return (this.options.file || '.further-review.yml,.further-review.yaml').split(',');
  }

  async getSignOffsFromFile(contents) {
    let data;

    try {
      data = yaml.safeLoad(contents, {
        json: true,
      });
    } catch (err) {
      this.log.warn('Unable to parse yaml');
      this.log.warn(err);

      return [];
    }

    this.log.debug(data);

    if (data && data.reviews && Array.isArray(data.reviews)) {
      const reviews = data.reviews
        .filter(r => r && r.logins && r.logins.length > 0);

      reviews
        .forEach((r, i) => {
          r.id = r.id || `further-review-file-${i}`;
          r.logins = r.logins.map(parseLogin);
        });

      return reviews;
    }

    return [];
  }
}

export {
  FurtherReviewFileSignOffProvider as default,
};
