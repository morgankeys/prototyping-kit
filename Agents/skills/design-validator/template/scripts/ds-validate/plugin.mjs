// The validator contract's rules as Stylelint rules (`ds/<rule id>`). Each rule takes
// `[true, { config: '<path to ds-validate.config.json>' }]`. Contract:
// Docs/Design system/design-in-code architecture.md ("Validator contract", "Token usage",
// "Scoping: global or component"). Rule ids are matched by the backlog's rationale
// carry-forward: never rename one.
import stylelint from 'stylelint';
import selectorParser from 'postcss-selector-parser';
import {
  classify,
  groupFor,
  isAllowedVariable,
  isExempt,
  isNamespaceVar,
  loadSettings,
  restrictingScopes,
} from './settings.mjs';
import { tokenPattern } from './lib/patterns.mjs';
import {
  literalColors,
  normalize,
  rawLengths,
  rawNumbersOrKeywords,
  varNames,
  parse,
} from './lib/values.mjs';

const plugins = [];
const code = (s) => `\`${s}\``;

function defineRule(id, check, { kinds = ['global', 'component', 'stylesheet'] } = {}) {
  const ruleName = `ds/${id}`;
  const rule = (primary, secondary) => (root, result) => {
    if (!primary || !secondary?.config) return;
    const settings = loadSettings(secondary.config);
    const file = root.source?.input?.file;
    if (!file) return;
    const info = classify(settings, file);
    if (!kinds.includes(info.kind) || isExempt(settings, info.rel, id)) return;
    const report = (node, detail) =>
      stylelint.utils.report({ ruleName, result, node, message: `${detail} (${ruleName})` });
    check(root, { settings, info, report });
  };
  rule.ruleName = ruleName;
  rule.messages = {};
  plugins.push(stylelint.createPlugin(ruleName, rule));
}

const isCustomProperty = (decl) => decl.prop.startsWith('--');
const inKeyframes = (node) => {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return true;
  }
  return false;
};
const declText = (decl) => `${decl.prop}: ${normalize(decl.value)}`;

// At-rules whose declarations are descriptors (defining a font or a property), not styles.
const DESCRIPTOR_AT_RULES = /^(font-face|property|counter-style|font-feature-values|font-palette-values|page)$/i;

function eachDecl(root, fn) {
  root.walkDecls((decl) => {
    if (decl.parent?.type === 'atrule' && DESCRIPTOR_AT_RULES.test(decl.parent.name)) return;
    fn(decl, decl.prop.toLowerCase());
  });
}

// ---- Validator contract: values -------------------------------------------------------

const COLOR_PROP = /^(color|fill|stroke|caret-color|accent-color|scrollbar-color|box-shadow|text-shadow|filter|backdrop-filter|-webkit-text-fill-color|.*-color|background.*|border.*|outline.*|column-rule.*|text-decoration.*|text-emphasis.*)$/;
const SPACING_PROP = /^(margin(-.+)?|padding(-.+)?|gap|row-gap|column-gap)$/;
const RADIUS_PROP = /^border(-.+)?-radius$/;

defineRule('hardcoded-color', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    if (isCustomProperty(decl) || !COLOR_PROP.test(prop)) return;
    if (literalColors(decl.value, settings.allowedValues).length) {
      report(decl, `${code(declText(decl))} uses a literal color.`);
    }
  }),
);

for (const [id, test] of [
  ['raw-spacing', (p) => SPACING_PROP.test(p)],
  ['raw-border-radius', (p) => RADIUS_PROP.test(p)],
  ['raw-font-size', (p) => p === 'font-size'],
]) {
  defineRule(id, (root, { settings, report }) =>
    eachDecl(root, (decl, prop) => {
      if (isCustomProperty(decl) || !test(prop)) return;
      if (rawLengths(decl.value, settings.allowedValues).length) {
        report(decl, `${code(declText(decl))} uses a raw length.`);
      }
    }),
  );
}

// Generic families may follow a token as a last fallback: `var(--x-font), sans-serif`.
const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif',
  'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong',
]);
defineRule('non-token-font-family', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    if (prop !== 'font-family') return;
    const nodes = parse(decl.value).nodes.filter((n) => n.type !== 'div' && n.type !== 'space');
    const isToken = (n) => n.type === 'function' && n.value.toLowerCase() === 'var' && n.nodes[0] && isNamespaceVar(settings, n.nodes[0].value);
    const isKeyword = (n) => n.type === 'word' && settings.allowedValues.has(n.value.toLowerCase());
    const isGeneric = (n) => n.type === 'word' && GENERIC_FAMILIES.has(n.value.toLowerCase());
    const viaToken = nodes.some(isToken);
    const ok = viaToken
      ? nodes.every((n) => isToken(n) || isGeneric(n) || isKeyword(n))
      : nodes.every(isKeyword);
    if (!ok) report(decl, `${code(declText(decl))} does not resolve through a token.`);
  }),
);

const WEIGHT_KEYWORDS = new Set(['normal', 'bold', 'bolder', 'lighter']);
const NORMAL = new Set(['normal']);
defineRule('raw-typography', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    const a = settings.allowedValues;
    let found = [];
    if (prop === 'font-weight') found = rawNumbersOrKeywords(decl.value, a, WEIGHT_KEYWORDS);
    else if (prop === 'line-height') found = rawNumbersOrKeywords(decl.value, a, NORMAL, { withUnits: true });
    else if (prop === 'letter-spacing') found = [...rawLengths(decl.value, a), ...rawNumbersOrKeywords(decl.value, a, NORMAL)];
    else return;
    if (found.length) report(decl, `${code(declText(decl))} uses a literal value.`);
  }),
);

defineRule('non-token-variable', (root, { settings, report }) =>
  eachDecl(root, (decl) => {
    const names = new Set(varNames(decl.value));
    if (isCustomProperty(decl)) names.add(decl.prop);
    for (const name of [...names].sort()) {
      if (isNamespaceVar(settings, name) || isAllowedVariable(settings, name)) continue;
      report(decl, `${code(name)} is a CSS variable outside the token namespace (${code(settings.prefix + '*')}).`);
    }
  }),
);

defineRule(
  'local-token-override',
  (root, { settings, report }) =>
    eachDecl(root, (decl) => {
      if (!isCustomProperty(decl) || !isNamespaceVar(settings, decl.prop)) return;
      if (varNames(decl.value).length) return;
      report(decl, `${code(decl.prop)} redefines a namespace token with a literal value: ${code(normalize(decl.value))}.`);
    }),
  { kinds: ['component', 'stylesheet'] },
);

// ---- Token usage ------------------------------------------------------------------------

function tokensIn(settings, decl) {
  if (isCustomProperty(decl)) return [];
  return [...new Set(varNames(decl.value).filter((n) => isNamespaceVar(settings, n)))];
}

function selectorChain(node) {
  const parts = [];
  for (let p = node.parent; p; p = p.parent) if (p.type === 'rule') parts.unshift(p.selector);
  return parts.join(' ');
}

defineRule('token-wrong-property', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    for (const token of tokensIn(settings, decl)) {
      const scopes = restrictingScopes(settings, token).filter((s) => settings.usage.scopes[s]);
      if (scopes.length && !scopes.some((s) => settings.usage.scopes[s](prop))) {
        report(decl, `${code(token)} in ${code(prop)} is outside its Figma scopes (${scopes.map(code).join(', ')}).`);
      }
      const g = groupFor(settings, token)?.group;
      if (g?.properties && !g.properties(prop)) {
        report(decl, `${code(token)} in ${code(prop)} is outside group ${code(g.id)}.`);
      }
    }
  }),
);

defineRule('token-not-for-direct-use', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    for (const token of tokensIn(settings, decl)) {
      const g = groupFor(settings, token)?.group;
      if (g && !g.direct) report(decl, `${code(token)} in ${code(prop)} is not for direct use (group ${code(g.id)}).`);
    }
  }),
);

defineRule('token-wrong-context', (root, { settings, report }) =>
  eachDecl(root, (decl, prop) => {
    const chain = selectorChain(decl);
    for (const token of tokensIn(settings, decl)) {
      const g = groupFor(settings, token)?.group;
      if (g?.selectors && !g.selectors.some((s) => chain.includes(s))) {
        report(decl, `${code(token)} in ${code(prop)} is outside the selectors of group ${code(g.id)}.`);
      }
    }
  }),
);

defineRule('token-unclassified', (root, { settings, report }) =>
  eachDecl(root, (decl) => {
    for (const token of tokensIn(settings, decl)) {
      if (!restrictingScopes(settings, token).length && !groupFor(settings, token)) {
        report(decl, `${code(token)} has no restricting Figma scope and no usage-map group.`);
      }
    }
  }),
);

defineRule('token-unpaired', (root, { settings, report }) => {
  const blocks = [root, ...collectRules(root)];
  for (const block of blocks) {
    const decls = (block.nodes ?? []).filter((n) => n.type === 'decl');
    const uses = decls.map((d) => ({ decl: d, prop: d.prop.toLowerCase(), tokens: tokensIn(settings, d) }));
    for (const use of uses) {
      for (const token of use.tokens) {
        const found = groupFor(settings, token);
        if (!found?.group.pairs.length) continue;
        for (const pair of found.group.pairs) {
          for (const other of uses) {
            if (other === use || !pair.properties(other.prop)) continue;
            for (const partner of other.tokens) {
              const short = partner.slice(settings.prefix.length);
              if (pair.tokens.some((p) => tokenPattern(p, found.captures)(short))) continue;
              report(
                use.decl,
                `${code(token)} in ${code(use.prop)} is paired with ${code(partner)} in ${code(other.prop)}, outside the pairs of group ${code(found.group.id)}.`,
              );
            }
          }
        }
      }
    }
  }
});

function collectRules(root) {
  const rules = [];
  root.walkRules((r) => rules.push(r));
  return rules;
}

// ---- Scoping errors ---------------------------------------------------------------------

// Split a parsed selector into compounds, tracking CSS-module style `:global` / `:local`
// switches. A compound is local when, in local mode, it has anything other than a
// `:global(...)` pseudo or a nesting `&`.
function hasLocalCompound(selector) {
  let mode = 'local';
  let compound = [];
  let local = false;
  const flush = () => {
    if (mode === 'local' && compound.some((n) => !isGlobalPseudo(n) && n.type !== 'nesting')) local = true;
    compound = [];
  };
  for (const node of selector.nodes) {
    if (node.type === 'combinator') {
      flush();
      continue;
    }
    if (node.type === 'pseudo' && /^:(global|local)$/i.test(node.value) && !node.nodes.length) {
      flush();
      mode = node.value.toLowerCase() === ':global' ? 'global' : 'local';
      continue;
    }
    compound.push(node);
  }
  flush();
  return local;
}
const isGlobalPseudo = (n) => n.type === 'pseudo' && n.value.toLowerCase() === ':global';

function ruleIsLocal(rule) {
  let local = false;
  selectorParser((sel) => {
    local = sel.nodes.length > 0 && sel.nodes.every((s) => hasLocalCompound(s));
  }).processSync(rule.selector);
  return local;
}

const STYLE_TAG = /<style\b([^>]*)>\s*$/i;
function blockScope(root, framework) {
  const m = STYLE_TAG.exec(root.raws?.codeBefore ?? '');
  if (!m) return { tag: null, scoped: true };
  const attrs = m[1];
  const tag = normalize(`<style${attrs}>`.replace(/\s+lang=("[^"]*"|'[^']*'|\S+)/i, ''));
  const has = (re) => re.test(attrs);
  let scoped = true;
  if (framework === 'vue') scoped = has(/\s(scoped|module)(\s|=|$)/i);
  else if (framework === 'astro') scoped = !has(/\sis:global(\s|=|$)/i);
  else if (framework === 'svelte') scoped = !has(/\sglobal(\s|=|$)/i);
  return { tag, scoped };
}

defineRule(
  'unscoped-style',
  (root, { info, report }) => {
    if (info.kind === 'component') {
      const { tag, scoped } = blockScope(root, info.framework);
      if (!scoped) {
        const first = root.first ?? root;
        return report(first, `${code(tag)} is not scoped.`);
      }
      const reported = new Set();
      root.walkRules((rule) => {
        if (inKeyframes(rule)) return;
        for (let p = rule.parent; p; p = p.parent) if (reported.has(p)) return;
        let ancestorLocal = false;
        for (let p = rule.parent; p; p = p.parent) if (p.type === 'rule' && ruleIsLocal(p)) ancestorLocal = true;
        if (ancestorLocal || ruleIsLocal(rule)) return;
        reported.add(rule);
        report(rule, `${code(normalize(rule.selector))} is not nested under one of the component's own selectors.`);
      });
      return;
    }
    // A stylesheet that is neither the global stylesheet, a token file, nor a CSS module:
    // its rules must sit inside @scope.
    const reported = new Set();
    root.walkRules((rule) => {
      if (inKeyframes(rule)) return;
      for (let p = rule.parent; p; p = p.parent) {
        if (reported.has(p)) return;
        if (p.type === 'atrule' && p.name.toLowerCase() === 'scope') return;
      }
      reported.add(rule);
      report(rule, `${code(normalize(rule.selector))} is outside \`@scope\` in a stylesheet that is not the global stylesheet.`);
    });
  },
  { kinds: ['component', 'stylesheet'] },
);

defineRule(
  'global-component-leak',
  (root, { settings, report }) =>
    root.walkRules((rule) => {
      if (inKeyframes(rule)) return;
      const offending = new Set();
      selectorParser((sel) => {
        sel.walk((node) => {
          if (node.type === 'class' && !settings.allowedGlobalClasses.has(node.value)) offending.add(`.${node.value}`);
          else if (node.type === 'id') offending.add(`#${node.value}`);
          else if (node.type === 'attribute' && /^data-/i.test(node.attribute) && !onRootElement(node)) {
            offending.add(`[${node.attribute}]`);
          }
        });
      }).processSync(rule.selector);
      if (offending.size) {
        report(
          rule,
          `${code(normalize(rule.selector))} styles a component in the global stylesheet (${[...offending].map(code).join(', ')}).`,
        );
      }
    }),
  { kinds: ['global'] },
);

// True when the attribute sits in a compound on `html` or `:root`, like a theme switch.
function onRootElement(attr) {
  const siblings = attr.parent.nodes;
  let start = siblings.indexOf(attr);
  let end = start;
  while (start > 0 && siblings[start - 1].type !== 'combinator') start--;
  while (end < siblings.length - 1 && siblings[end + 1].type !== 'combinator') end++;
  return siblings
    .slice(start, end + 1)
    .some((n) => (n.type === 'tag' && n.value.toLowerCase() === 'html') || (n.type === 'pseudo' && n.value.toLowerCase() === ':root'));
}

export default plugins;
