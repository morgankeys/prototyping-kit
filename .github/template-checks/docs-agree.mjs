// Structural agreement between files that describe the same thing. Wording still needs a
// review; this catches the drift a script can see.
//   node .github/template-checks/docs-agree.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, codeIn, exists, read, report, tableRows } from './lib.mjs';

const problems = [];

// Frontmatter `name` and `description`, including folded (`>-`) values.
function frontmatter(rel) {
  const m = /^---\n([\s\S]*?)\n---/.exec(read(rel));
  if (!m) return {};
  const out = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([a-z-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2];
    if (/^[>|]-?$/.test(value)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(' ');
    }
    out[kv[1]] = value.trim();
  }
  return out;
}

// 1. Every skill has both discovery stubs, with the same name and description, pointing back.
const skills = fs
  .readdirSync(path.join(ROOT, 'Agents/skills'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'example-skill' && exists(`Agents/skills/${d.name}/SKILL.md`))
  .map((d) => d.name);
for (const skill of skills) {
  const source = `Agents/skills/${skill}/SKILL.md`;
  const fm = frontmatter(source);
  if (fm.name !== skill) problems.push(`${source}: frontmatter name is \`${fm.name}\`, not \`${skill}\`.`);
  for (const tool of ['.claude', '.cursor']) {
    const stub = `${tool}/skills/${skill}/SKILL.md`;
    if (!exists(stub)) {
      problems.push(`${stub} is missing: ${tool === '.claude' ? 'Claude Code' : 'Cursor'} won't find /${skill}.`);
      continue;
    }
    const s = frontmatter(stub);
    if (s.name !== fm.name) problems.push(`${stub}: name \`${s.name}\` differs from ${source}.`);
    if (s.description !== fm.description) problems.push(`${stub}: description differs from ${source}.`);
    if (!read(stub).includes(source)) problems.push(`${stub} doesn't point to ${source}.`);
  }
}
for (const tool of ['.claude', '.cursor']) {
  if (!exists(`${tool}/skills`)) continue;
  for (const d of fs.readdirSync(path.join(ROOT, tool, 'skills'))) {
    if (!skills.includes(d)) problems.push(`${tool}/skills/${d} has no Agents/skills/${d}/SKILL.md.`);
  }
}

// 2. Every skill is routed in AGENTS.md and listed in Agents/README.md.
const agents = read('AGENTS.md');
const index = read('Agents/README.md');
for (const skill of skills) {
  if (!agents.includes(`Agents/skills/${skill}/SKILL.md`)) problems.push(`AGENTS.md has no routing row for \`${skill}\`.`);
  if (!index.includes(`\`${skill}\``)) problems.push(`Agents/README.md doesn't list \`${skill}\`.`);
}

// 3. The validator contract and the reference build name the same rules, and agree on
//    which are scoping errors.
const contract = read('Docs/Design system/design-in-code architecture.md');
const contractRules = [...tableRows(contract, '## Validator contract'), ...tableRows(contract, '### Usage rules')]
  .map(([rule, flags]) => ({ id: codeIn(rule), gate: /\*\*Scoping error\.\*\*/.test(flags ?? '') }))
  .filter((r) => r.id);
const settings = read('Agents/skills/design-validator/template/scripts/ds-validate/settings.mjs');
const listOf = (name) => [...(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`).exec(settings)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
const built = new Set([...listOf('DEVIATION_RULES'), ...listOf('GATE_RULES')]);
const builtGates = new Set(listOf('GATE_RULES'));
for (const r of contractRules) {
  if (!built.has(r.id)) problems.push(`Rule \`${r.id}\` is in the contract but not in the reference validator.`);
  if (r.gate !== builtGates.has(r.id)) problems.push(`Rule \`${r.id}\`: the contract and the reference validator disagree on whether it is a scoping error.`);
}
for (const id of built) {
  if (!contractRules.some((r) => r.id === id)) problems.push(`Rule \`${id}\` is in the reference validator but not in the contract.`);
}

// 4. The setup checklist is self-consistent: unique ids, and every dependency and stub
//    names an item that exists.
const checklist = read('Agents/skills/setup/checklist.md');
const sections = checklist.split('\n').filter((l) => /^## \d+\. /.test(l));
const items = sections.flatMap((h) => tableRows(checklist, h)).map((row) => ({ id: codeIn(row[0]), needs: row[4] ?? '' }));
const ids = new Set();
for (const { id } of items) {
  if (ids.has(id)) problems.push(`Checklist item \`${id}\` is defined twice.`);
  ids.add(id);
}
for (const { id, needs } of items) {
  for (const m of needs.matchAll(/`([a-z0-9-]+)`/g)) {
    if (!ids.has(m[1])) problems.push(`Checklist item \`${id}\` needs \`${m[1]}\`, which is not an item.`);
  }
}
for (const row of tableRows(checklist, '## Stubs')) {
  const item = codeIn(row[3]);
  if (item && !ids.has(item)) problems.push(`Stub ${codeIn(row[0])} belongs to \`${item}\`, which is not an item.`);
}

// 5. Every role CI runs is a role in Code/README.md's command table.
const roles = new Set(tableRows(read('Code/README.md'), '## Commands').map((r) => codeIn(r[0])));
const ci = read('.github/workflows/ci.yml');
for (const m of ci.matchAll(/^\s*- name: ([a-z-]+)\s*$/gm)) {
  if (m[1] !== 'setup' && !roles.has(m[1])) problems.push(`ci.yml runs \`${m[1]}\`, which is not a role in Code/README.md.`);
}

report('docs agree', problems);
