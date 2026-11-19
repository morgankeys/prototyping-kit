// The template must stay a template. Fails, with plain instructions, when someone has
// started setting up a prototype here instead of in a kit made with ./new-kit.sh.
//   node .github/template-checks/setup-not-started.mjs
import { codeIn, exists, read, report, tableRows, trackedFiles } from './lib.mjs';

const CHECKLIST = 'Agents/skills/setup/checklist.md';
const TEMPLATE_CODE_FILES = new Set(['Code/README.md', 'Code/ARCHITECTURE.md', 'Code/.env.example']);
const EMPTY_FOLDERS = ['Docs/Design system/Figma/Tokens/', 'Docs/Design system/Figma/Assets/'];

const problems = [];

// 1. Progress is tracked only in kits.
if (exists('Docs/setup-status.md')) {
  problems.push('`Docs/setup-status.md` exists: setup progress is being tracked here.');
}

// 2. Code/ holds only the template's placeholders, never a stack.
const code = trackedFiles('Code/').filter((f) => !TEMPLATE_CODE_FILES.has(f));
if (code.length) {
  const shown = code.slice(0, 5).map((f) => `\`${f}\``).join(', ');
  problems.push(`\`Code/\` has project files (${shown}${code.length > 5 ? `, and ${code.length - 5} more` : ''}): a stack has been added.`);
}

// 3. No Figma exports dropped in yet.
for (const folder of EMPTY_FOLDERS) {
  const files = trackedFiles(folder).filter((f) => !f.endsWith('/README.md'));
  if (files.length) problems.push(`\`${folder}\` has files (\`${files[0]}\`${files.length > 1 ? ', …' : ''}): design files have been brought in.`);
}

// 4. Every placeholder the template ships with is still a placeholder.
for (const [stub, fileCell, markerCell] of tableRows(read(CHECKLIST), '## Stubs')) {
  const file = codeIn(fileCell);
  const marker = codeIn(markerCell);
  if (!file || !marker) continue;
  if (!exists(file)) problems.push(`\`${file}\` is missing (placeholder ${codeIn(stub)}).`);
  else if (!read(file).includes(marker)) {
    problems.push(`\`${file}\` no longer has its placeholder \`${marker}\` (${codeIn(stub)}): it has been filled in.`);
  }
}

// 5. Only a kit records where it came from.
if (/^(Created|Forked) from prototyping-kit @/m.test(read('README.md'))) {
  problems.push('`README.md` has a "Created from prototyping-kit" line, which only a kit has.');
}

report('setup has not started in the template', problems, {
  intro: [
    '',
    'This repo is the prototyping-kit TEMPLATE (it has new-kit.sh), but someone has started',
    'setting up a prototype in it. The template stays empty so every new kit starts clean.',
    '',
    'To fix it, do one of these:',
    '  1. If this repo is meant to be where you build your prototype: ask your agent to',
    '     run the /setup skill here. It will turn this copy into a proper kit for you,',
    '     and this check stops.',
    '  2. If this repo is the template you make new kits from: run ./new-kit.sh to make',
    '     a kit, then ask your agent to run the /setup skill from the new kit. Move these',
    '     changes over there, and undo them here.',
    '',
    'What was found:',
  ].join('\n'),
});
