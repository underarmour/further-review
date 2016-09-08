# How it Works

When a new PR is submitted and every time it is commented on the webhook will be fired.  The webhook then performs the following actions:

1. Update commit stats to `Pending`
1. Look up required reviews based on files in the PR, among other criteria
1. Gather sign-offs in comments
1. Compare the lists to see if the PR is approved
1. If its not approved, see who hasn't been mentioned already in the PR and mention those people to take a look

  ![Notifying maintainers](img/mention-notify.png)

1. Update the status to either `Success` or `Failure`

Maintainers can then sign-off on the PR by commenting `LGTM` and the webhook will then compare those to the required lists and update the PR status once its requirements are satisfied:

![Successful review with sign-offs](img/merge-success.png)

If the review fails due to missing sign-offs, but you are an admin of the repo, you can still override and merge:

![Admin override](img/merge-fail-admin.png)
