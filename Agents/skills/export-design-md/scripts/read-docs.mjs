// Shared reader for Docs/Design system. /export-design-md and the platform export
// both use this so the two cannot drift. No dependencies beyond Node 18+.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

export const GUIDELINE_ORDER = [
  "overview", "color", "typography", "layout", "elevation", "shape",
  "motion", "accessibility", "content",
];
const SKIP_FILES = new Set(["README.md", "_template.md", "components.md"]);
const SKIP_SECTIONS = new Set(["sources", "open questions"]);

const rel = (root, p) => relative(root, p);

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, ext);
    return p.endsWith(ext) ? [p] : [];
  });
}

export const docsDir = (root) => join(root, "Docs/Design system");
export const guidelinesDir = (root) => join(docsDir(root), "Guidelines");

const tokenDirs = (root) => [
  join(docsDir(root), "Figma/Tokens/unpacked"),
  join(docsDir(root), "Supplemental"),
];

// --- Guidelines --------------------------------------------------------------------------

const isPlaceholder = (line) =>
  line.includes("…") || /<[A-Za-z][^>]*>/.test(line) || /^\s*-\s*\*\*(Do|Don't)\*\*\s*$/.test(line);

export function cleanGuideline(text) {
  const body = text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const sections = [];
  let current = { heading: null, lines: [] };
  for (const line of body.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      sections.push(current);
      current = { heading: line, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  const kept = [];
  for (const { heading, lines } of sections) {
    if (!heading || heading.startsWith("# ")) continue;
    const name = heading.replace(/^#+\s*/, "").trim().toLowerCase();
    if (SKIP_SECTIONS.has(name)) continue;
    const out = [];
    let table = [];
    const flushTable = () => {
      if (table.length > 2) out.push(...table);
      table = [];
    };
    for (const line of lines) {
      if (line.trim().startsWith("|")) {
        if (!isPlaceholder(line)) table.push(line);
        continue;
      }
      flushTable();
      if (!isPlaceholder(line)) out.push(line);
    }
    flushTable();
    const content = out.join("\n").trim();
    if (content) kept.push(`${heading.replace(/^##/, "###")}\n\n${content}`);
  }
  return kept.join("\n\n");
}

export function guidelineFiles(root) {
  const dir = guidelinesDir(root);
  const all = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith(".md") && !SKIP_FILES.has(f))
    : [];
  const ordered = GUIDELINE_ORDER.map((t) => `${t}.md`).filter((f) => all.includes(f));
  return [...ordered, ...all.filter((f) => !ordered.includes(f)).sort()];
}

export function readGuidelines(root) {
  return guidelineFiles(root).flatMap((file) => {
    const content = cleanGuideline(readFileSync(join(guidelinesDir(root), file), "utf8"));
    if (!content) return [];
    const id = file.replace(/\.md$/, "");
    const title = id.charAt(0).toUpperCase() + id.slice(1);
    return [{ id, file, title, content }];
  });
}

// --- Tokens ------------------------------------------------------------------------------

const hex2 = (n) => Math.round(n * 255).toString(16).padStart(2, "0").toUpperCase();

// Figma stores opacity in `alpha`; `hex` is RGB only. The digest keeps an 8-digit hex.
export function colorValue(v) {
  if (typeof v === "string") return v;
  const alpha = v.alpha ?? 1;
  let rgb = v.hex?.slice(0, 7).toUpperCase();
  if (!rgb && v.components) {
    const c = Array.isArray(v.components)
      ? v.components
      : [v.components.red, v.components.green, v.components.blue];
    rgb = `#${c.map(hex2).join("")}`;
  }
  return alpha < 1 ? `${rgb}${hex2(alpha)}` : rgb;
}

function channelsOf(v) {
  if (v.components) {
    const c = Array.isArray(v.components)
      ? v.components
      : [v.components.red, v.components.green, v.components.blue];
    return c.map((n) => Math.round(Number(n) * 255));
  }
  const hex = v.hex?.replace("#", "").slice(0, 6);
  if (!hex || hex.length < 6) return null;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// CSS form of the same rule the token pipeline uses: opaque hex, translucent rgb(/ a).
export function colorCss(v) {
  if (typeof v === "string") return v;
  const alpha = v.alpha ?? 1;
  if (alpha < 1) {
    const channels = channelsOf(v);
    if (!channels) return colorValue(v);
    return `rgb(${channels.join(" ")} / ${alpha})`;
  }
  return colorValue(v);
}

function isColorObject(v) {
  return Boolean(v && typeof v === "object" && !Array.isArray(v) &&
    (v.hex || v.components || v.colorSpace || "alpha" in v));
}

function isModeMap(v, type) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  if (type === "color" && isColorObject(v)) return false;
  const entries = Object.entries(v);
  if (!entries.length) return false;
  return entries.every(([, child]) =>
    typeof child === "string" || typeof child === "number" || typeof child === "boolean" || isColorObject(child));
}

function flatten(node, path, out) {
  if (node && typeof node === "object" && "$value" in node) {
    out.push({
      segments: path,
      type: node.$type ?? "",
      raw: node.$value,
      description: typeof node.$description === "string" ? node.$description : "",
    });
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith("$")) flatten(child, [...path, key], out);
  }
}

function digestOf(type, raw) {
  const value = type === "color" && !isModeMap(raw, type) ? colorValue(raw) : raw;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function tokenGroups(root) {
  return tokenDirs(root).flatMap((dir) => walk(dir, ".json")).flatMap((file) => {
    const tokens = [];
    try {
      flatten(JSON.parse(readFileSync(file, "utf8")), [], tokens);
    } catch (err) {
      console.error(`warning: skipped ${rel(root, file)}: ${err.message}`);
      return [];
    }
    return tokens.length
      ? [{ file, tokens: tokens.map((t) => ({ path: t.segments.join("."), type: t.type, value: digestOf(t.type, t.raw) })) }]
      : [];
  });
}

const UNITLESS = /(weight|line-height|lineheight|opacity|alpha|z-index|zindex|scale|ratio|tracking|letter-spacing|order)$/i;

export function kebab(segments) {
  return segments.join("-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function cssOf(type, raw, segments) {
  if (typeof raw === "string" && /^\{[^{}]+\}$/.test(raw.trim())) {
    const target = kebab(raw.trim().slice(1, -1).split("."));
    return `var(--${target})`;
  }
  if (type === "color") return colorCss(raw);
  if (type === "number" || typeof raw === "number") {
    const last = segments[segments.length - 1] ?? "";
    if (UNITLESS.test(last)) return String(raw);
    if (/duration|delay|^time$/i.test(last)) return `${raw}ms`;
    return `${raw}px`;
  }
  if (typeof raw === "string") {
    if (/font/i.test(segments.join(".")) && /\s/.test(raw) && !raw.includes(",")) return JSON.stringify(raw);
    return raw;
  }
  if (typeof raw === "boolean") return raw ? "1" : "0";
  return null;
}

function fileStem(file) {
  return basename(file).replace(/\.json$/i, "").replace(/\.tokens$/i, "");
}

function applyStructuralModes(list) {
  const tails = new Map();
  for (const token of list) {
    if (token.segments.length < 2) continue;
    const tail = token.segments.slice(1).join(".");
    const heads = tails.get(tail) ?? new Set();
    heads.add(token.segments[0]);
    tails.set(tail, heads);
  }
  for (const token of list) {
    if (token.mode || token.segments.length < 2) continue;
    const tail = token.segments.slice(1).join(".");
    if ((tails.get(tail)?.size ?? 0) > 1) {
      token.mode = token.segments[0];
      token.segments = token.segments.slice(1);
    }
  }
}

// Tokens with a CSS value. Modes come from a value that maps mode names to values,
// from a repeated first path segment in one file, or from the same path in files
// whose names differ. Selectors are chosen later; this only names the modes.
export function readTokens(root, warn = () => {}) {
  const flat = [];
  for (const file of tokenDirs(root).flatMap((dir) => walk(dir, ".json"))) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      warn(`skipped ${rel(root, file)}: ${err.message}`);
      continue;
    }
    const found = [];
    flatten(parsed, [], found);
    const stem = fileStem(file);
    for (const token of found) {
      if (isModeMap(token.raw, token.type)) {
        for (const [mode, raw] of Object.entries(token.raw)) {
          flat.push({ ...token, raw, mode, stem, segments: [...token.segments] });
        }
      } else {
        flat.push({ ...token, mode: null, stem, segments: [...token.segments] });
      }
    }
  }

  const byStem = new Map();
  for (const token of flat) {
    const list = byStem.get(token.stem) ?? [];
    list.push(token);
    byStem.set(token.stem, list);
  }
  for (const list of byStem.values()) applyStructuralModes(list);

  const unmoded = flat.filter((token) => !token.mode);
  const byPath = new Map();
  for (const token of unmoded) {
    const key = token.segments.join(".");
    const list = byPath.get(key) ?? [];
    list.push(token);
    byPath.set(key, list);
  }
  for (const list of byPath.values()) {
    const stems = new Set(list.map((token) => token.stem));
    if (stems.size > 1 && list.length === stems.size) {
      for (const token of list) token.mode = token.stem;
    }
  }

  const grouped = new Map();
  for (const token of flat) {
    const key = token.segments.join(".");
    const css = cssOf(token.type, token.raw, token.segments);
    if (css == null) {
      warn(`skipped ${key}: no CSS value for type ${token.type || "unknown"}`);
      continue;
    }
    const entry = grouped.get(key) ?? {
      path: key,
      name: kebab(token.segments),
      type: token.type,
      description: token.description,
      modes: new Map(),
      plain: [],
    };
    if (token.mode) entry.modes.set(token.mode, css);
    else entry.plain.push(css);
    if (token.description) entry.description = token.description;
    grouped.set(key, entry);
  }

  const tokens = [];
  const names = new Set();
  for (const entry of grouped.values()) {
    if (names.has(entry.name)) {
      warn(`duplicate CSS name --${entry.name} from ${entry.path}; kept the first`);
      continue;
    }
    names.add(entry.name);
    if (entry.modes.size) {
      tokens.push({
        path: entry.path,
        name: entry.name,
        type: entry.type,
        description: entry.description,
        modes: Object.fromEntries(entry.modes),
      });
    } else {
      tokens.push({
        path: entry.path,
        name: entry.name,
        type: entry.type,
        description: entry.description,
        css: entry.plain.at(-1),
      });
    }
  }
  return tokens;
}

export function defaultMode(names) {
  const list = [...names];
  for (const want of ["light", "default", "base", "baseline"]) {
    const hit = list.find((name) => name.toLowerCase() === want);
    if (hit) return hit;
  }
  return list.sort((a, b) => a.localeCompare(b))[0];
}
