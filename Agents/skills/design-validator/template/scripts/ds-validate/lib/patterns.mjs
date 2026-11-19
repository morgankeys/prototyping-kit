// Pattern helpers for the token usage map (contract: "Token usage" in
// Docs/Design system/design-in-code architecture.md).

const escape = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
const SEGMENTS = '[^-]+(?:-[^-]+)*';

// Token name pattern, written after `--<namespace>-`.
// `*` matches any run of characters; `{name}` captures one or more hyphen-separated
// segments, as many as still let the pattern match.
export function tokenPattern(pattern, captures = {}) {
  let src = '';
  const names = [];
  for (const part of pattern.split(/(\{[a-z]+\}|\*)/i)) {
    if (part === '*') src += '.*';
    else if (/^\{[a-z]+\}$/i.test(part)) {
      const key = part.slice(1, -1);
      if (key in captures) src += escape(captures[key]);
      else {
        names.push(key);
        src += `(${SEGMENTS})`;
      }
    } else src += escape(part);
  }
  const re = new RegExp(`^${src}$`);
  return (name) => {
    const m = re.exec(name);
    if (!m) return null;
    const out = {};
    names.forEach((key, i) => (out[key] = m[i + 1]));
    return out;
  };
}

// CSS property pattern. A trailing `*` matches the property and any longhand
// (`padding*` matches `padding-inline-start`); a `*` inside matches one or more
// segments (`border-*-radius` matches `border-top-left-radius`).
export function propertyPattern(pattern) {
  const p = pattern.toLowerCase();
  if (p.endsWith('*') && !p.slice(0, -1).includes('*')) {
    const base = p.slice(0, -1);
    return (prop) => prop === base || prop.startsWith(base.endsWith('-') ? base : `${base}-`);
  }
  const re = new RegExp(`^${p.split('*').map(escape).join(SEGMENTS)}$`);
  return (prop) => re.test(prop);
}

// Expand a property list that may reference `@sets`, into a matcher.
export function propertyList(list, propertySets, seen = new Set()) {
  const matchers = [];
  for (const entry of list ?? []) {
    if (entry.startsWith('@')) {
      const name = entry.slice(1);
      if (seen.has(name)) continue;
      const set = propertySets?.[name];
      if (!Array.isArray(set)) throw new Error(`Unknown property set \`${entry}\` in the usage map.`);
      matchers.push(propertyList(set, propertySets, new Set([...seen, name])));
    } else matchers.push(propertyPattern(entry));
  }
  return (prop) => matchers.some((m) => m(prop));
}
