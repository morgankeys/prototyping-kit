// Builds a throwaway prototype (Code/ + Docs/) in a temp folder and runs `validate` on it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validate } from '../template/scripts/ds-validate/validate.mjs';

export const USAGE_MAP = {
  namespace: 'ds',
  propertySets: {
    fill: ['background', 'background-color'],
    'text-color': ['color'],
    spacing: ['margin*', 'padding*', 'gap'],
  },
  figmaScopes: { GAP: ['@spacing'], TEXT_FILL: ['@text-color'], FRAME_FILL: ['@fill'] },
  groups: [
    { id: 'primitive', match: 'ref-*', direct: false },
    { id: 'state-layer', match: 'color-state-*', properties: ['@fill'], selectors: [':hover'] },
    { id: 'on-color', match: 'color-on-{role}', properties: ['@text-color'], pairs: [{ properties: ['@fill'], tokens: ['color-{role}'] }] },
    { id: 'color', match: 'color-*', properties: ['@fill', '@text-color'] },
    { id: 'spacing', match: 'spacing-*', properties: ['@spacing'] },
    { id: 'radius', match: 'shape-*', properties: ['border-radius', 'border-*-radius'] },
    { id: 'type', match: 'type-*', properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'] },
    { id: 'unused', match: 'elevation-*' },
  ],
};

export const MANIFEST = {
  '--ds-color-primary': { type: 'color', scopes: ['FRAME_FILL'] },
  '--ds-color-on-primary': { type: 'color', scopes: ['TEXT_FILL'] },
  '--ds-color-surface': { type: 'color', scopes: ['FRAME_FILL'] },
  '--ds-color-state-hover': { type: 'color', scopes: ['FRAME_FILL'] },
  '--ds-spacing-md': { type: 'number', scopes: ['GAP'] },
  '--ds-shape-sm': { type: 'number', scopes: ['ALL_SCOPES'] },
  '--ds-type-body-family': { type: 'string' },
  '--ds-type-body-size': { type: 'number' },
  '--ds-type-body-weight': { type: 'number' },
  '--ds-type-body-line': { type: 'number' },
  '--ds-type-body-tracking': { type: 'number' },
  '--ds-ref-blue-500': { type: 'color' },
  '--ds-misc-thing': { type: 'number' },
};

export const CONFIG = {
  include: ['src/**/*.{css,svelte,vue,astro}'],
  tokenFiles: ['src/styles/tokens/**/*.css'],
  globalStylesheets: ['src/styles/global.css'],
  manifest: 'src/styles/tokens/manifest.json',
  allowedVariables: ['--tw-*'],
};

// files: { 'src/x.svelte': '...' } relative to Code/. Options override the config,
// usage map, or manifest.
export function makePrototype(files = {}, { config = {}, usageMap = USAGE_MAP, manifest = MANIFEST } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-validate-'));
  const write = (rel, text) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  };
  write('Docs/Design system/token-usage.json', JSON.stringify(usageMap, null, 2));
  write('Code/ds-validate.config.json', JSON.stringify({ ...CONFIG, ...config }, null, 2));
  if (manifest) write('Code/src/styles/tokens/manifest.json', JSON.stringify(manifest, null, 2));
  write('Code/src/styles/tokens/tokens.css', ':root { --ds-color-primary: #6750a4; padding: 3px; }\n');
  for (const [rel, text] of Object.entries(files)) write(path.join('Code', rel), text);
  return {
    root,
    write: (rel, text) => write(path.join('Code', rel), text),
    backlogPath: path.join(root, 'Docs/Design system/deviations-backlog.md'),
    backlog: () => fs.readFileSync(path.join(root, 'Docs/Design system/deviations-backlog.md'), 'utf8'),
    run: (opts = {}) => {
      const lines = [];
      return validate({ config: path.join(root, 'Code/ds-validate.config.json'), log: (l) => lines.push(l), ...opts }).then(
        (r) => ({ ...r, output: lines.join('\n') }),
      );
    },
  };
}

// Compact "rule@line" list, sorted, for assertions.
export const summary = (findings) => findings.map((f) => `${f.rule}@${f.line}`).sort();
export const details = (findings, rule) => findings.filter((f) => f.rule === rule).map((f) => f.detail);
