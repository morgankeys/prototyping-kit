// /setup's scan script still reads the checklist the way the checklist is written.
//   node .github/template-checks/setup-scan.test.mjs
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, codeIn, read, report, tableRows } from './lib.mjs';

const problems = [];
let out = '';
try {
  out = execFileSync('node', [path.join(ROOT, 'Agents/skills/setup/scripts/setup-scan.mjs')], { cwd: ROOT, encoding: 'utf8' });
} catch (err) {
  problems.push(`setup-scan.mjs failed to run: ${err.message.split('\n')[0]}`);
}

if (out) {
  const checklist = read('Agents/skills/setup/checklist.md');
  const items = checklist.split('\n').filter((l) => /^## \d+\. /.test(l)).flatMap((h) => tableRows(checklist, h)).filter((r) => codeIn(r[0]));
  const stubs = tableRows(checklist, '## Stubs').filter((r) => codeIn(r[0]));

  if (!/^Repo: TEMPLATE/m.test(out)) problems.push('it does not recognise the template.');
  const itemCount = /(\d+) checklist items/.exec(out)?.[1];
  if (Number(itemCount) !== items.length) problems.push(`it read ${itemCount ?? 'no'} items; the checklist defines ${items.length}.`);
  const stubLine = /(\d+) open, (\d+) filled, (\d+) file gone \(of (\d+)\)/.exec(out);
  if (!stubLine) problems.push('it printed no stub summary.');
  else {
    const [, open, filled, gone, total] = stubLine.map(Number);
    if (total !== stubs.length) problems.push(`it read ${total} stubs; the checklist lists ${stubs.length}.`);
    if (filled || gone || open !== total) problems.push(`in the template every stub should be open; it reports ${open} open, ${filled} filled, ${gone} gone.`);
  }
}

report('setup-scan reads the checklist', problems);
