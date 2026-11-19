#!/usr/bin/env node
// `validate`: design-system validation. Rewrites the deviations backlog, prints a
// summary, and exits 0 with deviations present, 1 on any scoping error (or, with
// --strict, any deviation), 2 when it could not run. Contract: "Exit codes and CI" in
// Docs/Design system/design-in-code architecture.md.
//
//   node scripts/ds-validate/validate.mjs [--strict] [--config ds-validate.config.json]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import stylelint from 'stylelint';
import { writeBacklog } from './backlog.mjs';
import { designSystemConfig } from './stylelint-config.mjs';
import { ConfigError, GATE_RULES, loadSettings } from './settings.mjs';

const RULE_SUFFIX = / \(ds\/[a-z0-9-]+\)$/;

export async function validate({ config = 'ds-validate.config.json', strict = false, log = console.log } = {}) {
  let settings;
  try {
    settings = loadSettings(config);
  } catch (err) {
    if (err instanceof ConfigError) {
      log(`validate: ${err.message}`);
      return { code: 2 };
    }
    throw err;
  }

  const result = await stylelint.lint({
    files: settings.include,
    ignorePattern: [...settings.ignore, ...settings.tokenFiles],
    cwd: settings.codeDir,
    config: designSystemConfig({ config: settings.configPath }),
    configBasedir: settings.codeDir,
    allowEmptyInput: true,
  });

  const rel = (file) => path.relative(settings.repoRoot, file).split(path.sep).join('/');
  const seen = new Set();
  const deviations = [];
  const scopingErrors = [];
  const broken = [];
  for (const r of result.results) {
    if (!r.source) continue;
    for (const w of r.warnings) {
      if (w.rule === 'CssSyntaxError') {
        broken.push(`${rel(r.source)}:${w.line}  ${w.text}`);
        continue;
      }
      if (!w.rule?.startsWith('ds/')) continue;
      const finding = { file: rel(r.source), line: w.line, rule: w.rule.slice(3), detail: w.text.replace(RULE_SUFFIX, '') };
      const k = `${finding.file}|${finding.line}|${finding.rule}|${finding.detail}`;
      if (seen.has(k)) continue;
      seen.add(k);
      (GATE_RULES.includes(finding.rule) ? scopingErrors : deviations).push(finding);
    }
    for (const w of r.invalidOptionWarnings ?? []) broken.push(`${rel(r.source)}  ${w.text}`);
  }

  if (broken.length) {
    log('validate: some styles could not be parsed. Fix them (run `lint`), then validate again:');
    for (const b of broken) log(`  ${b}`);
    return { code: 2, deviations, scopingErrors };
  }

  const changed = writeBacklog(settings.backlogPath, deviations);

  const counts = {};
  for (const d of deviations) counts[d.rule] = (counts[d.rule] ?? 0) + 1;
  log(`validate: ${deviations.length} deviation${deviations.length === 1 ? '' : 's'}.`);
  for (const [rule, n] of Object.entries(counts).sort()) log(`  ${rule}: ${n}`);
  log(`  Backlog ${changed ? 'updated' : 'unchanged'}: ${rel(settings.backlogPath)}`);

  for (const w of usageMapWarnings(settings)) log(`warning: ${w}`);

  if (scopingErrors.length) {
    log(`validate: ${scopingErrors.length} scoping error${scopingErrors.length === 1 ? '' : 's'}. Move each style to its home`);
    log('  (see "Scoping: global or component" in Docs/Design system/design-in-code architecture.md):');
    for (const e of scopingErrors.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
      log(`  ${e.file}:${e.line}  ${e.rule}  ${e.detail}`);
    }
  }

  const code = scopingErrors.length || (strict && deviations.length) ? 1 : 0;
  return { code, deviations, scopingErrors, changed };
}

export function usageMapWarnings(settings) {
  if (!settings.manifest) {
    return ['No token manifest found, so Figma scope checks are off. Set `manifest` in ds-validate.config.json once `tokens` writes one.'];
  }
  const names = Object.keys(settings.manifest).filter((n) => n.startsWith(settings.prefix));
  const out = [];
  for (const g of settings.usage.groups) {
    const hit = names.some((n) => (!g.collection || settings.manifest[n]?.collection === g.collection) && g.match(n.slice(settings.prefix.length)));
    if (!hit) out.push(`usage-map group \`${g.id}\` matches no token in the manifest.`);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--config');
  const { code } = await validate({ strict: args.includes('--strict'), config: i >= 0 ? args[i + 1] : undefined });
  process.exitCode = code;
}
