# Contributing to Block Check

Thanks for helping. This file covers who runs the project, what it will and won't take, how fast you can expect a reply, and how to test and send a change.

## Who maintains it

Voyager Marketing maintains Block Check. Ben Whitlock ([@benwhit](https://github.com/benwhit)) is the lead maintainer and makes the calls on scope, design and releases. Decisions are made in public GitHub issues, so the reasoning stays where anyone can read it.

## Scope: one composite action, few moving parts

Block Check validates WordPress block markup in a pull request with Block Runner, optionally against a Wesper site manifest, and reports the result on the pull request. Changes keep it that way:

- **Exact tool versions.** `block-runner` and `wesper` are pinned to exact versions in `action.yml`. A bump is its own reviewed pull request, never a range.
- **Pull request content is untrusted.** Nothing from the checked files reaches a shell, and the comment step never runs for a pull request from a fork.
- **`v1` moves only on a release.** Consumers pin `@v1`. A merge to `main` changes no one's CI until `v1` is moved to it.

If you're unsure whether something fits, open a discussion before you write code.

## Support window and releases

Issues are answered within two business days. Support hours are in the [README](README.md#support). "Answered" means a maintainer replies; a fix may take longer. Security fixes follow [SECURITY.md](SECURITY.md).

## Test

The self-test workflow runs the action against the fixtures in `test/`: one job must pass on valid markup and one must fail on broken markup. Both are required checks on `main`, and a pull request needs them green to merge.

To run the check locally, the Node version in `action.yml` and the pinned tools:

```
npm install block-runner@1.0.0 wesper@0.5.0
node scripts/check.mjs --strict
```

`.claude/settings.json` is the tracked permission allowlist for mission runs in this repo. Put your own connector grants in `.claude/settings.local.json` (gitignored) or in your user-level settings.

## Send a change

1. Fork, branch from `main`, and keep the change to one thing.
2. Add or update a fixture under `test/` that shows the change working, and one that shows it failing where it should.
3. Open a pull request that says what changed and why, and how you checked it.
