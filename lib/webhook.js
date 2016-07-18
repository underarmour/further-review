function handleGitHubWebhook(github, reviewer, event) {
  if (event.issue && event.comment && ['created', 'edited', 'deleted'].includes(event.action)) {
    return Promise.resolve({
      owner: event.repository.owner.login,
      repo: event.repository.name,
      number: event.issue.number,
    })
    .then(params => github.getPullRequest(params)
      .then(pr => {
        params.sha = pr.head.sha;
        return params;
      }))
    .then(params => reviewer.processReviews(params));
  } else if (event.pull_request && ['opened', 'synchronize', 'reopened'].includes(event.action)) {
    return reviewer.processReviews({
      owner: event.pull_request.base.repo.owner.login,
      repo: event.pull_request.base.repo.name,
      sha: event.pull_request.head.sha,
      number: event.pull_request.number,
    });
  }

  // nothing to do;
  return undefined;
}

export { handleGitHubWebhook as default };
