// Shared helpers for the template's own checks. Template only: new-kit.sh deletes this
// folder from every new kit.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// Tracked files only, so local scratch files never change a result.
export function trackedFiles(...patterns) {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...patterns], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

// Markdown table rows under a heading, as arrays of trimmed cells (header row dropped).
export function tableRows(markdown, heading) {
  const lines = markdown.split('\n');
  let i = heading ? lines.findIndex((l) => l.trim() === heading) : 0;
  if (i < 0) return [];
  const rows = [];
  for (i += 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,6} /.test(l)) break;
    if (!l.startsWith('|')) continue;
    if (/^\|\s*-{3}/.test(l)) continue;
    rows.push(l.slice(1, l.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim()));
  }
  return rows.slice(1);
}

// The first `code` span in a cell.
export const codeIn = (cell) => /`([^`]+)`/.exec(cell ?? '')?.[1];

export function report(name, problems, { intro } = {}) {
  if (!problems.length) {
    console.log(`${name}: ok`);
    return;
  }
  console.log(`${name}: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  if (intro) console.log(intro);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
}
