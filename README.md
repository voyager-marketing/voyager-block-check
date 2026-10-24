# Block Check

A GitHub Action that validates WordPress block markup on every pull request, so broken patterns never reach a site and the "Attempt Block Recovery" prompt never reaches an editor.

It runs [Block Runner](https://github.com/humanmade/block-runner) (Human Made) over your patterns, templates and template parts, using the same parser the block editor uses. If you give it a [Wesper](https://github.com/humanmade/wesper) `site.context.json`, it also checks that manifest and validates design tokens against the real site.

- Works on `.html` templates and parts **and** `.php` pattern files (the header and inline PHP are handled, and reported lines match the original file).
- Annotates the exact file and line in the PR diff.
- Posts one summary comment per PR and updates it on every push.

## Usage

```yaml
# .github/workflows/block-check.yml
name: Block Check
on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  blocks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: voyager-marketing/voyager-block-check@v1
```

### With a Wesper manifest

Collect the manifest from your site (`wesper collect --wp-path ./public --out site.context.json`), commit it, and point the Action at it:

```yaml
      - uses: voyager-marketing/voyager-block-check@v1
        with:
          wesper-manifest: site.context.json
```

### A theme or plugin inside a larger repo

```yaml
      - uses: voyager-marketing/voyager-block-check@v1
        with:
          working-directory: wp-content/themes/my-theme
```

## Inputs

| Input | Default | What it does |
|---|---|---|
| `paths` | `patterns/**/*.php patterns/**/*.html templates/**/*.html parts/**/*.html` | Space-separated globs to check |
| `strict` | `true` | Fail on Block Runner strict warnings too, not only invalid blocks |
| `wesper-manifest` | | Path to a Wesper `site.context.json` to validate and use as the token source |
| `working-directory` | `.` | Folder the globs are relative to |
| `comment` | `true` | Post or update a PR summary comment |
| `block-runner-version` | `1.0.0` | Exact block-runner version; bumped by reviewed PR |
| `wesper-version` | `0.5.0` | Exact wesper version; bumped by reviewed PR |
| `github-token` | `github.token` | Token used for the PR comment |

### Why the versions are pinned

The Action installs Block Runner and Wesper from npm at run time, where Dependabot can't see them. Exact pins mean a new release reaches your CI only after a reviewed PR here bumps the default, rather than on the day it is published.

Node is pinned too, to 24.22.1. Block Runner 1.0.0 refuses any Node below 22.23.4, and `setup-node` with `'22'` resolves to whatever 22.x the runner has cached (22.23.3 on ubuntu-latest in October 2026), so a loose pin fails before a single block is checked.

## Outputs

`ok`, `blocks`, `invalid`, `warnings`.

## Run it locally

```bash
npm install block-runner@1.0.0 wesper@0.5.0
node path/to/voyager-block-check/scripts/check.mjs --strict
```

## Roadmap

- Collect a fresh Wesper manifest in CI from a WordPress Playground or wp-env site, then fail on binding and registry gaps (`wesper collect --strict`).

## License

GPL-2.0-or-later, matching Block Runner and Wesper.
