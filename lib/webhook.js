function handleGitHubWebhook(github, reviewer, event) {
  if (event.issue && event.comment && ['created', 'edited', 'deleted'].includes(event.action)) {
    return reviewer.review({
      owner: event.repository.owner.login,
      repo: event.repository.name,
      number: event.issue.number,
    });
  } else if (event.pull_request && ['opened', 'synchronize', 'reopened'].includes(event.action)) {
    return reviewer.review({
      owner: event.pull_request.base.repo.owner.login,
      repo: event.pull_request.base.repo.name,
      number: event.pull_request.number,
    });
  }

  // nothing to do;
  return undefined;
}

export { handleGitHubWebhook as default };
