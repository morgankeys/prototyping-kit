// Builds the design-system Stylelint config. `validate` uses it, and so can an editor
// (see ../../stylelint.design-system.config.mjs). `lint`'s own config never loads it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_RULES, GATE_RULES } from './settings.mjs';

const pluginPath = fileURLToPath(new URL('./plugin.mjs', import.meta.url));

export function designSystemConfig({ config, extends: base } = {}) {
  const abs = path.resolve(config ?? 'ds-validate.config.json');
  const rules = {};
  for (const id of ALL_RULES) {
    rules[`ds/${id}`] = [true, { config: abs, severity: GATE_RULES.includes(id) ? 'error' : 'warning' }];
  }
  return {
    ...(base ? { extends: base } : {}),
    plugins: [pluginPath],
    rules,
    overrides: [{ files: ['**/*.{svelte,vue,astro,html}'], customSyntax: 'postcss-html' }],
  };
}
