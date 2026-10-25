# Changelog

All notable changes to Block Check are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`v1` is a floating tag. It moves only when a `v1.x.y` GitHub Release is published.

## [1.0.1] - 2026-10-25

### Changed

- Pin Node to 24.22.1, the version Block Runner 1.0.0 needs on the hosted runners.
- Default `block-runner-version` to the exact `1.0.0` and `wesper-version` to the exact `0.5.0`, so a new upstream release never reaches a consumer unreviewed.
- `v1` moves only when a release is published. It no longer follows every push to `main`.

### Added

- GitHub Release for the action, which the Marketplace listing needs.
- Security policy, contributing guide, code of conduct and issue templates.

## [1.0.0] - 2026-10-24

First release of the action. It cannot run Block Runner 1.0.0 on the hosted runners (no Node 24 pin) and is superseded by 1.0.1. The `v1.0.0` tag stays in place.

### Added

- Composite action that validates `.html` templates and parts and `.php` pattern files with Block Runner, reports the file and line on the pull request, and keeps one summary comment per pull request.
- Optional Wesper `site.context.json` support: the manifest is schema-validated and used as Block Runner's token source.

[1.0.1]: https://github.com/voyager-marketing/voyager-block-check/releases/tag/v1.0.1
[1.0.0]: https://github.com/voyager-marketing/voyager-block-check/releases/tag/v1.0.0
