// Every relative link and #anchor in the repo's Markdown points at something that exists.
//   node .github/template-checks/links.mjs
import path from 'node:path';
import { ROOT, exists, read, report, trackedFiles } from './lib.mjs';

// GitHub's heading anchors: lowercase, punctuation dropped, spaces to hyphens, -1, -2 for repeats.
function anchors(markdown) {
  const seen = new Map();
  const out = new Set();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = !fenced && /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '');
    const base = text.toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  return out;
}

const cache = new Map();
const anchorsOf = (rel) => cache.get(rel) ?? cache.set(rel, anchors(read(rel))).get(rel);

const problems = [];
let count = 0;
for (const file of trackedFiles('*.md', '*.mdc')) {
  let fenced = false;
  read(file).split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) return;
    for (const m of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const url = m[1];
      if (/^(https?:|mailto:|#$)/.test(url)) continue;
      count++;
      const [target, anchor] = url.split('#');
      let rel = file;
      if (target) {
        rel = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(target)));
        if (!exists(rel)) {
          problems.push(`${file}:${i + 1}  ${url}  (no such file)`);
          continue;
        }
      }
      if (anchor && rel.endsWith('.md') && !anchorsOf(rel).has(decodeURIComponent(anchor))) {
        problems.push(`${file}:${i + 1}  ${url}  (no heading #${anchor} in ${rel})`);
      }
    }
  });
}
report(`links (${count} checked)`, problems);
void ROOT;
