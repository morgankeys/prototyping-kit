// Loads ds-validate.config.json and everything it points to. Cached per config path,
// so every rule in a run shares one copy.
import fs from 'node:fs';
import path from 'node:path';
import { propertyList, tokenPattern } from './lib/patterns.mjs';

export const DEVIATION_RULES = [
  'hardcoded-color',
  'raw-spacing',
  'raw-border-radius',
  'non-token-font-family',
  'raw-font-size',
  'raw-typography',
  'non-token-variable',
  'local-token-override',
  'token-wrong-property',
  'token-not-for-direct-use',
  'token-wrong-context',
  'token-unpaired',
  'token-unclassified',
];
// Scoping errors: never in the backlog, always fail `validate`.
export const GATE_RULES = ['unscoped-style', 'global-component-leak'];
export const ALL_RULES = [...DEVIATION_RULES, ...GATE_RULES];

const DEFAULT_ALLOWED_VALUES = [
  '0', 'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'transparent', 'currentcolor', 'none',
];

// Component file types and how each one marks a <style> block as not scoped.
export const COMPONENT_EXTENSIONS = {
  '.svelte': 'svelte',
  '.vue': 'vue',
  '.astro': 'astro',
};

const cache = new Map();

export class ConfigError extends Error {}

const readJson = (file, what) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return undefined;
    throw new ConfigError(`Could not read ${what} at ${file}: ${err.message}`);
  }
};

const asList = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function loadSettings(configPath) {
  const abs = path.resolve(configPath);
  if (cache.has(abs)) return cache.get(abs);

  const raw = readJson(abs, 'the validator config');
  if (!raw) throw new ConfigError(`No validator config at ${abs}.`);
  const codeDir = path.dirname(abs);
  const at = (p) => path.resolve(codeDir, p);

  const repoRoot = at(raw.repoRoot ?? '..');
  const usageMapPath = at(raw.usageMap ?? '../Docs/Design system/token-usage.json');
  const usageMap = readJson(usageMapPath, 'the token usage map');
  if (!usageMap) throw new ConfigError(`No token usage map at ${usageMapPath}.`);

  const namespace = raw.namespace ?? usageMap.namespace;
  if (!namespace || namespace.includes('<')) {
    throw new ConfigError(
      'The token namespace is still a placeholder. Record it as `namespace` in the token usage map first.',
    );
  }

  const manifestPath = raw.manifest ? at(raw.manifest) : undefined;
  const manifest = manifestPath ? readJson(manifestPath, 'the token manifest') : undefined;

  const exemptions = asList(raw.exemptions).map((e) => {
    const rules = asList(e.rules);
    const gate = rules.filter((r) => GATE_RULES.includes(r));
    if (gate.length) {
      throw new ConfigError(
        `Exemption for ${e.files} lists ${gate.join(', ')}. Scoping errors can't be exempted; move the style to its home instead.`,
      );
    }
    if (!e.why) throw new ConfigError(`Exemption for ${e.files} has no \`why\`.`);
    return { files: asList(e.files), rules };
  });

  const allowedGlobalClasses = asList(raw.allowedGlobalClasses).map((c) => {
    if (typeof c !== 'object' || !c.class || !c.for) {
      throw new ConfigError('Each allowed global class needs `class` (without the dot) and `for`.');
    }
    return c.class.replace(/^\./, '');
  });

  const settings = {
    configPath: abs,
    codeDir,
    repoRoot,
    namespace,
    prefix: `--${namespace}-`,
    include: asList(raw.include ?? ['src/**/*.{css,svelte,vue,astro}']),
    ignore: asList(raw.ignore ?? ['**/node_modules/**']),
    tokenFiles: asList(raw.tokenFiles),
    globalStylesheets: asList(raw.globalStylesheets),
    allowedGlobalClasses: new Set(allowedGlobalClasses),
    allowedValues: new Set([...DEFAULT_ALLOWED_VALUES, ...asList(raw.allowedValues)].map((v) => v.toLowerCase())),
    allowedVariables: asList(raw.allowedVariables).map((p) => tokenPattern(p.replace(/^--/, ''))),
    exemptions,
    backlogPath: at(raw.backlog ?? '../Docs/Design system/deviations-backlog.md'),
    manifestPath,
    manifest,
    usage: compileUsageMap(usageMap),
  };
  cache.set(abs, settings);
  return settings;
}

function compileUsageMap(map) {
  const sets = map.propertySets ?? {};
  const scopes = {};
  for (const [scope, list] of Object.entries(map.figmaScopes ?? {})) {
    if (!scope.startsWith('$')) scopes[scope] = propertyList(list, sets);
  }
  const groups = (map.groups ?? []).map((g) => ({
    id: g.id,
    collection: g.collection,
    match: tokenPattern(g.match),
    properties: g.properties ? propertyList(g.properties, sets) : undefined,
    direct: g.direct !== false,
    selectors: g.selectors,
    pairs: (g.pairs ?? []).map((p) => ({ properties: propertyList(p.properties, sets), tokens: p.tokens })),
  }));
  return { scopes, groups };
}

const matches = (rel, globs) => globs.some((g) => path.matchesGlob(rel, g));

// What kind of file this is, for the scoping rules and exemptions.
export function classify(settings, file) {
  const rel = path.relative(settings.codeDir, file).split(path.sep).join('/');
  if (matches(rel, settings.tokenFiles)) return { rel, kind: 'token' };
  if (matches(rel, settings.globalStylesheets)) return { rel, kind: 'global' };
  const ext = path.extname(rel).toLowerCase();
  if (COMPONENT_EXTENSIONS[ext]) return { rel, kind: 'component', framework: COMPONENT_EXTENSIONS[ext] };
  if (/\.module\.(css|scss|less)$/i.test(rel)) return { rel, kind: 'component', framework: 'css-module' };
  return { rel, kind: 'stylesheet' };
}

export function isExempt(settings, rel, rule) {
  return settings.exemptions.some((e) => e.rules.includes(rule) && matches(rel, e.files));
}

export function isNamespaceVar(settings, name) {
  return name.startsWith(settings.prefix);
}

export function isAllowedVariable(settings, name) {
  return settings.allowedVariables.some((m) => m(name.slice(2)));
}

// The token's usage-map group, or undefined.
export function groupFor(settings, token) {
  const short = token.slice(settings.prefix.length);
  const entry = settings.manifest?.[token];
  for (const g of settings.usage.groups) {
    if (g.collection && entry?.collection !== g.collection) continue;
    const captures = g.match(short);
    if (captures) return { group: g, captures };
  }
  return undefined;
}

// The Figma scopes that restrict the token, or [] when none do.
export function restrictingScopes(settings, token) {
  const scopes = settings.manifest?.[token]?.scopes ?? [];
  if (!scopes.length || scopes.includes('ALL_SCOPES')) return [];
  return scopes;
}
