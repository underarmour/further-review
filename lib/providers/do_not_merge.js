import BaseProvider from './base';
import { dedent } from '../common';

class DoNotMergeProvider extends BaseProvider {

  async containsBlockingPhrase() {
    const { owner, repo, number } = this.pr;
    const [pattern, options] = this.config(
      'do_not_merge_title_regex',
      'do_not_merge_title_regex_options',
    );

    const doNotMergeRegex = new RegExp(pattern, options);
    const { title } = await this.github.getPullRequest({ owner, repo, number });

    return title.match(doNotMergeRegex);
  }

  renderComment(isBlocked) {
    if (!isBlocked) return '';

    return dedent `
         ### Do Not Merge
         Pull request contains a phrase that disabled the merge.
       `;
  }

  async review() {
    const isBlocked = await this.containsBlockingPhrase();

    this.log.debug(`Blocking context: ${isBlocked}`);

    return {
      success: !isBlocked,
      comment: this.renderComment(isBlocked),

      // additional state for unit testing
      isBlocked,
    };
  }
}

export {
  DoNotMergeProvider as
  default,
};
