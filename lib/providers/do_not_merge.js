import BaseProvider from './base';

class DoNotMergeProvider extends BaseProvider {

  async containsBlockingPhrase() {
    const { owner, repo, number } = this.pr;
    const [pattern, options] = this.config(
      'do_not_merge_comment_regex',
      'do_not_merge_comment_regex_options',
    );

    const doNotMergeRegex = new RegExp(pattern, options);
    const request = await this.github.getPullRequest({ owner, repo, number });

    return request.title.match(doNotMergeRegex);
  }

  async review() {
    const isBlocked = await this.containsBlockingPhrase();

    this.log.debug(`Blocking context: ${isBlocked}`);

    return {
      success: !isBlocked,
      comment: (isBlocked) ? 'Pull request has been flaged as Do Not Merge.' : '',

      // additional state for unit testing
      isBlocked,
    };
  }
}

export {
  DoNotMergeProvider as
  default,
};
