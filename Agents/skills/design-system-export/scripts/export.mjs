#!/usr/bin/env node
// Docs → platform packages. Deterministic. Does not read Code/ except to
// validate a component manifest the skill has already written.
//
//   node Agents/skills/design-system-export/scripts/export.mjs
//   node Agents/skills/design-system-export/scripts/export.mjs lovable v0
//   node Agents/skills/design-system-export/scripts/export.mjs --list
//   node Agents/skills/design-system-export/scripts/export.mjs --self-test
//
// Exit 3 when Docs has nothing to export. A rejected component is skipped
// and named; the Docs package is still written.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadComponents } from "./components.mjs";
import { buildModel } from "./model.mjs";
import { TARGETS, renderArchives } from "./targets.mjs";
import { readGuidelines, tokenGroups } from "../../export-design-md/scripts/read-docs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function parseArgs(argv) {
  const opts = { targets: [], out: null, repo: ROOT, components: null, selfTest: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") opts.list = true;
    else if (arg === "--self-test") opts.selfTest = true;
    else if (arg === "--out") opts.out = resolve(argv[++i]);
    else if (arg === "--repo") opts.repo = resolve(argv[++i]);
    else if (arg === "--components") opts.components = resolve(argv[++i]);
    else if (arg.startsWith("--")) throw new Error(`unknown flag ${arg}`);
    else opts.targets.push(arg);
  }
  return opts;
}

export function exportDesignSystem({ repo, out, componentsDir, targets }) {
  const chosen = targets.length ? targets : Object.keys(TARGETS);
  for (const id of chosen) {
    if (!TARGETS[id]) throw new Error(`unknown target ${id}. Known: ${Object.keys(TARGETS).join(", ")}`);
  }
  const guidelines = readGuidelines(repo);
  const groups = tokenGroups(repo);
  const tokenCount = groups.reduce((n, group) => n + group.tokens.length, 0);
  if (!guidelines.length && !tokenCount) {
    const error = new Error("Nothing to export yet: every guideline is a stub and there are no tokens.");
    error.code = 3;
    throw error;
  }
  const loaded = loadComponents(repo, componentsDir);
  const model = buildModel(repo, loaded.components);
  model.warnings.push(...loaded.skipped.map((line) => `component skipped: ${line}`));
  const built = chosen.map((id) => ({ id, result: TARGETS[id].build(model) }));
  const dest = out ?? join(repo, "Export/design-system");
  rmSync(dest, { recursive: true, force: true });
  for (const { id, result } of built) {
    const dir = join(dest, id);
    for (const [path, content] of Object.entries(result.files)) {
      const file = join(dir, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    for (const [name, bytes] of Object.entries(renderArchives(result.archives ?? []))) {
      writeFileSync(join(dir, name), bytes);
    }
  }
  return { dest, warnings: model.warnings, components: loaded.components.map((component) => component.name) };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.list) {
    for (const [id, target] of Object.entries(TARGETS)) console.log(`${id}\t${target.title}`);
    return;
  }
  if (opts.selfTest) {
    return import("./self-test.mjs").then((mod) => mod.selfTest());
  }
  try {
    const result = exportDesignSystem({
      repo: opts.repo,
      out: opts.out,
      componentsDir: opts.components ?? join(opts.repo, "Agents/skills/design-system-export/components"),
      targets: opts.targets,
    });
    console.log(`Wrote ${result.dest}`);
    if (result.components.length) console.log(`Components: ${result.components.join(", ")}`);
    else console.log("Components: none");
    for (const warning of result.warnings) console.error(`warning: ${warning}`);
  } catch (err) {
    console.error(err.message);
    process.exit(err.code === 3 ? 3 : 1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
