# Security policy

## Report a vulnerability privately

Please don't open a public issue, discussion or pull request for a security problem.

Report it through GitHub's private vulnerability reporting: go to the repository's **Security** tab and choose **Report a vulnerability** ([direct link](https://github.com/voyager-marketing/voyager-block-check/security/advisories/new)). Only the maintainers can see the report.

Include what you can of:

- the Block Check ref you use (for example `@v1` or a commit) and the workflow that calls it
- what an attacker can do, and what they need first (for example opening a pull request from a fork)
- steps or a proof of concept to reproduce it

## What happens next

- **Within two business days:** a maintainer acknowledges your report, during the support hours in the [README](README.md#support).
- **Within ten business days:** we tell you whether we can reproduce it and how serious we think it is, or ask you for more detail.
- **Fix:** a confirmed vulnerability is fixed as soon as it's ready, and `v1` moves to the fix. We agree a disclosure date with you, publish a GitHub security advisory, and credit you unless you'd rather stay anonymous.

## Supported versions

Only the commit `v1` points to gets security fixes. If you pin a commit, move to the one `v1` points to before you report.

## What counts

Block Check runs inside other repositories' CI, on markup from their pull requests. These are in scope:

- content of a pull request (a pattern, template or part, or a Wesper manifest) that makes the action run a command, read a secret or write outside its working directory
- the pull request comment step acting on a pull request from a fork, or with a token or scope the workflow did not pass in
- content of a pull request that lands unescaped in the comment in a way that misleads reviewers, for example a forged pass
- the action installing anything other than the exact `block-runner` and `wesper` versions it pins

Out of scope: problems in Block Runner, Wesper or GitHub Actions themselves, and inputs the calling workflow sets (`paths`, `working-directory`, the version pins). The workflow author controls those, not the pull request.
