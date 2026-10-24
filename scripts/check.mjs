#!/usr/bin/env node
// Block Check: validate Gutenberg block markup in a WordPress repo with Block Runner,
// optionally against a Wesper site.context.json manifest.
//
// Usage: node check.mjs --paths "<glob> <glob>" [--strict] [--manifest site.context.json]
//                       [--bin <dir with node_modules/.bin>] [--out report.json]
//
// PHP pattern files are supported: the file header and inline PHP are stripped so the
// block comments and HTML that remain can be validated. Reported paths and lines always
// point at the original file.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { globSync } from 'node:fs';

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();
const binDir = args.bin ? resolve(args.bin) : join(cwd, 'node_modules', '.bin');
const blockRunner = join(binDir, 'block-runner');
const wesper = join(binDir, 'wesper');
const patterns = (args.paths || 'patterns/**/*.php patterns/**/*.html templates/**/*.html parts/**/*.html')
  .split(/[\s,]+/)
  .filter(Boolean);

const files = [...new Set(patterns.flatMap((p) => globSync(p, { cwd })))].sort();

const report = {
  ok: true,
  files: files.length,
  blocks: 0,
  valid: 0,
  invalid: 0,
  warnings: 0,
  manifest: null,
  problems: [],
};

// 1. Optional Wesper manifest: schema validation first, then use it as Block Runner's token source.
if (args.manifest) {
  const manifestPath = resolve(cwd, args.manifest);
  if (!existsSync(manifestPath)) {
    fail(`Wesper manifest not found: ${args.manifest}`);
  }
  const res = spawnSync(wesper, ['validate', manifestPath], { encoding: 'utf8' });
  report.manifest = {
    path: args.manifest,
    valid: res.status === 0,
    output: (res.stdout + res.stderr).trim().slice(0, 4000),
  };
  if (res.status !== 0) report.ok = false;
}

// 2. Stage every file as plain block markup so one Block Runner run covers them all.
const stage = mkdtempSync(join(tmpdir(), 'block-check-'));
const staged = new Map(); // staged relative path -> { file, lineOffset }
for (const file of files) {
  const src = readFileSync(join(cwd, file), 'utf8');
  const { markup, lineOffset } = file.endsWith('.php') ? phpToMarkup(src) : { markup: src, lineOffset: 0 };
  if (!markup.includes('<!-- wp:')) continue; // nothing to validate (e.g. a PHP helper in patterns/)
  const stagedRel = file.replace(/\.php$/, '.php.html');
  mkdirSync(dirname(join(stage, stagedRel)), { recursive: true });
  writeFileSync(join(stage, stagedRel), markup);
  staged.set(stagedRel, { file, lineOffset });
}

if (staged.size > 0) {
  const brArgs = ['validate', '**/*.html', '--json'];
  if (args.strict) brArgs.push('--strict');
  if (args.manifest) brArgs.push('--token-resolver', 'context', '--context', resolve(cwd, args.manifest));
  const res = spawnSync(blockRunner, brArgs, { cwd: stage, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let out;
  try {
    out = JSON.parse(res.stdout);
  } catch {
    fail(`Block Runner did not return JSON (exit ${res.status}):\n${(res.stdout + res.stderr).slice(0, 4000)}`);
  }
  report.blocks = out.summary?.blocks ?? 0;
  report.valid = out.summary?.valid ?? 0;
  report.invalid = out.summary?.invalid ?? 0;
  report.warnings = out.summary?.warnings ?? 0;
  for (const item of out.items ?? []) {
    const stagedRel = item.source?.path ? relative('.', item.source.path) : null;
    const origin = stagedRel ? staged.get(stagedRel) : null;
    report.problems.push({
      file: origin?.file ?? stagedRel ?? '(unknown)',
      line: item.source?.htmlLine != null ? item.source.htmlLine + (origin?.lineOffset ?? 0) : null,
      block: item.block ?? null,
      status: item.status ?? 'warning',
      reason: item.reason ?? item.message ?? '',
    });
  }
  if (res.status !== 0) report.ok = false;
}

// 3. Output: JSON report, job summary, markdown for a PR comment.
const markdown = toMarkdown(report);
if (args.out) writeFileSync(args.out, JSON.stringify(report, null, 2));
writeFileSync(args.md || 'block-check.md', markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `ok=${report.ok}\nblocks=${report.blocks}\ninvalid=${report.invalid}\nwarnings=${report.warnings}\n`,
  );
}
for (const p of report.problems) {
  const level = p.status === 'invalid' ? 'error' : 'warning';
  const loc = p.line ? `file=${p.file},line=${p.line}` : `file=${p.file}`;
  console.log(`::${level} ${loc}::${p.block ?? 'block'}: ${p.reason.replace(/\r?\n/g, ' ')}`);
}
console.log(markdown);
process.exit(report.ok ? 0 : 1);

// ---------------------------------------------------------------------------

function phpToMarkup(src) {
  // Drop a leading `<?php ... ?>` header (pattern registration comment), counting its lines
  // so reported line numbers still match the original file.
  let lineOffset = 0;
  let body = src;
  const header = body.match(/^\s*<\?php[\s\S]*?\?>/);
  if (header) {
    lineOffset = header[0].split('\n').length - 1;
    body = body.slice(header[0].length);
  }
  // Replace remaining inline PHP (echo esc_html__(...), etc.) with neutral text,
  // keeping any newlines so line numbers stay aligned.
  body = body.replace(/<\?(?:php|=)[\s\S]*?\?>/g, (m) => 'x' + '\n'.repeat(m.split('\n').length - 1));
  return { markup: body, lineOffset };
}

function toMarkdown(r) {
  const icon = r.ok ? '✅' : '❌';
  const lines = [
    `### ${icon} Block Check`,
    '',
    `| Files | Blocks | Valid | Invalid | Warnings |`,
    `|---:|---:|---:|---:|---:|`,
    `| ${r.files} | ${r.blocks} | ${r.valid} | ${r.invalid} | ${r.warnings} |`,
  ];
  if (r.manifest) {
    lines.push('', `**Wesper manifest** \`${r.manifest.path}\`: ${r.manifest.valid ? 'valid' : 'invalid'}`);
    if (!r.manifest.valid) lines.push('', '```', r.manifest.output, '```');
  }
  if (r.problems.length) {
    lines.push('', '| Status | File | Block | Reason |', '|---|---|---|---|');
    for (const p of r.problems.slice(0, 50)) {
      const where = p.line ? `${p.file}:${p.line}` : p.file;
      lines.push(`| ${p.status} | \`${where}\` | \`${p.block ?? ''}\` | ${escapeCell(p.reason)} |`);
    }
    if (r.problems.length > 50) lines.push('', `…and ${r.problems.length - 50} more.`);
  }
  lines.push('', '<sub>Validated with [Block Runner](https://github.com/humanmade/block-runner)' +
    (r.manifest ? ' against a [Wesper](https://github.com/humanmade/wesper) manifest' : '') + '.</sub>');
  return lines.join('\n');
}

function escapeCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 300);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else out[key] = argv[++i];
  }
  if (out.strict === 'false') out.strict = false;
  return out;
}

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(2);
}
