// Inventory and component-manifest checks. The skill writes the manifest.
// This module only decides whether a port may be packaged.
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

const PLACEHOLDER = /<[^>\n]+>/;

export function readInventory(repoRoot) {
  const file = join(repoRoot, "Docs/Design system/Guidelines/components.md");
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n");
  const rows = [];
  let inInventory = false;
  let inTable = false;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inInventory = /^##\s+Inventory\b/.test(line);
      inTable = false;
      continue;
    }
    if (!inInventory || !line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!inTable) {
      inTable = true;
      continue;
    }
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const [name, , code] = cells;
    if (!name || PLACEHOLDER.test(name) || PLACEHOLDER.test(code ?? "")) continue;
    rows.push({ name, code: code || "" });
  }
  return rows;
}

export function extractContract(text) {
  const classes = new Set();
  const dataAttrs = new Set();
  const classPattern = /(?:class|className)\s*=\s*(?:\{?\s*)["'`]([^"'`]*)["'`]/g;
  for (const match of text.matchAll(classPattern)) {
    for (const token of match[1].split(/\s+/)) if (token && !token.includes("{") && !token.includes("}")) classes.add(token);
  }
  for (const match of text.matchAll(/\b(data-[a-zA-Z0-9-]+)/g)) dataAttrs.add(match[1]);
  return {
    classes,
    dataAttrs,
    inlineStyle: /\sstyle\s*=/.test(text) || /style\{\{/.test(text),
    hardcodedColor: /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(text),
  };
}

function relTo(root, file) {
  const base = resolve(root);
  const abs = resolve(root, file);
  if (abs !== base && !abs.startsWith(base + sep)) return null;
  return abs;
}

// Returns { components, skipped }. A skipped entry names the check that failed.
// Valid ports are still returned when a sibling fails.
export function loadComponents(repoRoot, componentsDir) {
  const manifestPath = join(componentsDir, "manifest.json");
  if (!existsSync(manifestPath)) return { components: [], skipped: [] };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    return { components: [], skipped: [`manifest.json: ${err.message}`] };
  }
  const inventory = readInventory(repoRoot);
  const byName = new Map(inventory.map((row) => [row.name, row]));
  const components = [];
  const skipped = [];
  for (const entry of manifest.components ?? []) {
    const reason = reject(repoRoot, componentsDir, entry, byName);
    if (reason) skipped.push(`${entry.name || "(unnamed)"}: ${reason}`);
    else components.push(accept(componentsDir, entry));
  }
  return { components, skipped };
}

function reject(repoRoot, componentsDir, entry, byName) {
  if (!entry.name || !entry.source || !entry.file) return "needs name, source, and file";
  const row = byName.get(entry.name);
  if (!row) return "not in the component inventory";
  const sourceAbs = relTo(repoRoot, entry.source);
  if (!sourceAbs || !existsSync(sourceAbs)) return `source not found: ${entry.source}`;
  if (row.code && row.code !== entry.source) return `inventory Code path is ${row.code}, manifest says ${entry.source}`;
  const portAbs = relTo(componentsDir, entry.file);
  if (!portAbs || !existsSync(portAbs)) return `port not found: ${entry.file}`;
  if (!entry.file.endsWith(".tsx")) return "port must be a .tsx file";
  const portText = readFileSync(portAbs, "utf8");
  if (!/export\s+default\b|\bas\s+default\b/.test(portText)) return "port needs a default export";
  const source = readFileSync(sourceAbs, "utf8");
  const port = portText;
  const cssAbs = entry.css ? relTo(componentsDir, entry.css) : null;
  const css = cssAbs && existsSync(cssAbs) ? readFileSync(cssAbs, "utf8") : "";
  if (entry.css && !css) return `css not found: ${entry.css}`;
  const fromSource = extractContract(source);
  const fromPort = extractContract(`${port}\n${css}`);
  if (fromPort.inlineStyle) return "port has an inline style";
  if (fromPort.hardcodedColor) return "port has a hardcoded color";
  for (const name of fromPort.classes) {
    if (!fromSource.classes.has(name)) return `class ${name} is not on the source`;
  }
  if (fromSource.classes.size && !fromPort.classes.size) return "port dropped the source class names";
  for (const name of fromPort.dataAttrs) {
    if (!fromSource.dataAttrs.has(name)) return `attribute ${name} is not on the source`;
  }
  if (fromSource.dataAttrs.size && ![...fromSource.dataAttrs].every((name) => fromPort.dataAttrs.has(name))) {
    return "port dropped a source data attribute";
  }
  return null;
}

function accept(componentsDir, entry) {
  return {
    name: entry.name,
    source: entry.source,
    file: basename(entry.file),
    code: readFileSync(join(componentsDir, entry.file), "utf8"),
    cssFile: entry.css ? basename(entry.css) : "",
    css: entry.css ? readFileSync(join(componentsDir, entry.css), "utf8") : "",
    summary: typeof entry.summary === "string" ? entry.summary : "",
    props: Array.isArray(entry.props) ? entry.props : [],
  };
}
