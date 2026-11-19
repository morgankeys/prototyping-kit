import { test } from 'node:test';
import assert from 'node:assert/strict';
import { details, makePrototype, summary } from './helpers.mjs';

const svelte = (css, markup = '<div class="card"></div>') => `${markup}\n<style>\n${css}\n</style>\n`;

test('clean component: no findings, backlog says so, exit 0', async () => {
  const proto = makePrototype({
    'src/lib/Card.svelte': svelte(
      '.card { color: var(--ds-color-on-primary); background: var(--ds-color-primary); padding: var(--ds-spacing-md); gap: 0; }',
    ),
  });
  const r = await proto.run();
  assert.equal(r.code, 0);
  assert.deepEqual(r.deviations, []);
  assert.deepEqual(r.scopingErrors, []);
  assert.match(proto.backlog(), /No deviations\./);
});

test('token files are never scanned', async () => {
  const r = await makePrototype().run();
  assert.deepEqual(r.deviations, []);
});

test('hardcoded-color: hex, named, rgb(), shorthands, var() fallbacks; allowed keywords pass', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte(
      [
        '.a {',
        '  color: #fff;',
        '  border: 1px solid red;',
        '  background: var(--ds-color-surface, #000);',
        '  box-shadow: 0 1px 2px rgb(0 0 0 / 20%);',
        '  outline-color: currentcolor;',
        '  border-color: transparent;',
        '  background-color: rgb(from var(--ds-color-primary) r g b / 50%);',
        '}',
      ].join('\n'),
    ),
  });
  const r = await proto.run();
  assert.deepEqual(summary(r.deviations.filter((d) => d.rule === 'hardcoded-color')), [
    'hardcoded-color@4',
    'hardcoded-color@5',
    'hardcoded-color@6',
    'hardcoded-color@7',
  ]);
  assert.ok(details(r.deviations, 'hardcoded-color').includes('`color: #fff` uses a literal color.'));
});

test('raw-spacing, raw-border-radius, raw-font-size: raw lengths, including mixed with a token and in calc()', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte(
      [
        '.a {',
        '  padding: 20px;',
        '  margin: calc(var(--ds-spacing-md) + 4px);',
        '  gap: 0;',
        '  padding-inline: var(--ds-spacing-md);',
        '  border-radius: 8px;',
        '  border-top-left-radius: var(--ds-shape-sm);',
        '  font-size: 1.25rem;',
        '  margin-block: calc(var(--ds-spacing-md) * 2);',
        '}',
      ].join('\n'),
    ),
  });
  const r = await proto.run();
  assert.deepEqual(summary(r.deviations), ['raw-border-radius@8', 'raw-font-size@10', 'raw-spacing@4', 'raw-spacing@5']);
  assert.deepEqual(details(r.deviations, 'raw-spacing'), ['`padding: 20px` uses a raw length.', '`margin: calc(var(--ds-spacing-md) + 4px)` uses a raw length.']);
});

test('non-token-font-family and raw-typography', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte(
      [
        '.a {',
        '  font-family: "Inter", sans-serif;',
        '  font-weight: 600;',
        '  line-height: 1.4;',
        '  letter-spacing: 0.02em;',
        '}',
        '.b {',
        '  font-family: var(--ds-type-body-family);',
        '  font-weight: var(--ds-type-body-weight);',
        '  line-height: var(--ds-type-body-line);',
        '  letter-spacing: 0;',
        '  font-family: inherit;',
        '  font-family: var(--ds-type-body-family), sans-serif;',
        '  font-family: sans-serif;',
        '}',
        '@font-face { font-family: "Inter"; font-weight: 400; src: url(inter.woff2); }',
      ].join('\n'),
    ),
  });
  const r = await proto.run();
  assert.deepEqual(summary(r.deviations), [
    'non-token-font-family@16',
    'non-token-font-family@4',
    'raw-typography@5',
    'raw-typography@6',
    'raw-typography@7',
  ]);
});

test('non-token-variable: definitions and references outside the namespace; allowed patterns pass', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte('.a { --gap: 4px; padding: var(--other-space); margin: var(--tw-space-x); }'),
  });
  const r = await proto.run();
  assert.deepEqual(details(r.deviations, 'non-token-variable'), [
    '`--gap` is a CSS variable outside the token namespace (`--ds-*`).',
    '`--other-space` is a CSS variable outside the token namespace (`--ds-*`).',
  ]);
});

test('local-token-override: literal redefinition in a component; a token-to-token alias passes', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte('.a { --ds-color-surface: #221f17; }\n.b { --ds-color-surface: var(--ds-color-primary); }'),
  });
  const r = await proto.run();
  assert.deepEqual(details(r.deviations, 'local-token-override'), [
    '`--ds-color-surface` redefines a namespace token with a literal value: `#221f17`.',
  ]);
});

test('token usage: wrong property (scope and group), not for direct use, wrong context, unpaired, unclassified', async () => {
  const proto = makePrototype({
    'src/lib/A.svelte': svelte(
      [
        '.a { font-size: var(--ds-spacing-md); }',
        '.b { color: var(--ds-ref-blue-500); }',
        '.c { background: var(--ds-color-state-hover); }',
        '.c:hover { background: var(--ds-color-state-hover); }',
        '.d { color: var(--ds-color-on-primary); background: var(--ds-color-surface); }',
        '.e { color: var(--ds-color-on-primary); background: var(--ds-color-primary); }',
        '.f { padding: var(--ds-misc-thing); }',
      ].join('\n'),
    ),
  });
  const r = await proto.run();
  const d = (rule) => details(r.deviations, rule);
  assert.deepEqual(d('token-wrong-property').sort(), [
    '`--ds-spacing-md` in `font-size` is outside group `spacing`.',
    '`--ds-spacing-md` in `font-size` is outside its Figma scopes (`GAP`).',
  ]);
  assert.deepEqual(d('token-not-for-direct-use'), ['`--ds-ref-blue-500` in `color` is not for direct use (group `primitive`).']);
  assert.deepEqual(summary(r.deviations.filter((x) => x.rule === 'token-wrong-context')), ['token-wrong-context@5']);
  assert.deepEqual(d('token-unpaired'), [
    '`--ds-color-on-primary` in `color` is paired with `--ds-color-surface` in `background`, outside the pairs of group `on-color`.',
  ]);
  assert.deepEqual(d('token-unclassified'), ['`--ds-misc-thing` has no restricting Figma scope and no usage-map group.']);
});

test('usage-map warning for a group that matches no token; no manifest turns scope checks off', async () => {
  const r = await makePrototype().run();
  assert.match(r.output, /usage-map group `unused` matches no token/);
  const r2 = await makePrototype({}, { manifest: null }).run();
  assert.match(r2.output, /No token manifest found/);
});

// ---- Scoping ------------------------------------------------------------------------------

test('svelte: <style global> and a bare :global() are scoping errors; nested escapes pass', async () => {
  const proto = makePrototype({
    'src/lib/Global.svelte': '<p>x</p>\n<style global>\np { margin: 0; }\n</style>\n',
    'src/lib/Escapes.svelte': svelte(
      [
        ':global(p) { margin: 0; }',
        '.card :global(p) { margin: 0; }',
        ':global(body) .card { margin: 0; }',
        ':global { h2 { margin: 0; } }',
        '.card :global { h3 { margin: 0; } }',
        '.card { & :global(a) { color: var(--ds-color-on-primary); } }',
      ].join('\n'),
    ),
  });
  const r = await proto.run();
  assert.equal(r.code, 1);
  assert.deepEqual(
    r.scopingErrors.map((e) => `${e.file.split('/').pop()}@${e.line} ${e.detail}`).sort(),
    [
      'Escapes.svelte@3 `:global(p)` is not nested under one of the component\'s own selectors.',
      'Escapes.svelte@6 `:global` is not nested under one of the component\'s own selectors.',
      'Global.svelte@3 `<style global>` is not scoped.',
    ],
  );
});

test('vue: a <style> without scoped or module is a scoping error', async () => {
  const proto = makePrototype({
    'src/lib/Plain.vue': '<template><div class="a"/></template>\n<style>\n.a { margin: 0; }\n</style>\n',
    'src/lib/Scoped.vue': '<template><div class="a"/></template>\n<style scoped>\n.a { margin: 0; }\n</style>\n',
    'src/lib/Module.vue': '<template><div :class="$style.a"/></template>\n<style module lang="css">\n.a { margin: 0; }\n</style>\n',
  });
  const r = await proto.run();
  assert.deepEqual(
    r.scopingErrors.map((e) => `${e.file.split('/').pop()} ${e.detail}`),
    ['Plain.vue `<style>` is not scoped.'],
  );
});

test('astro: <style is:global> is a scoping error', async () => {
  const proto = makePrototype({
    'src/components/Hero.astro': '---\nconst t = 1;\n---\n<h1>x</h1>\n<style is:global>\nh1 { margin: 0; }\n</style>\n',
    'src/components/Ok.astro': '---\n---\n<h1 class="t">x</h1>\n<style>\n.t { margin: 0; }\n</style>\n',
  });
  const r = await proto.run();
  assert.deepEqual(r.scopingErrors.map((e) => e.detail), ['`<style is:global>` is not scoped.']);
});

test('css modules: top-level :global() and a :global switch are errors; nested escapes pass', async () => {
  const proto = makePrototype({
    'src/lib/Card.module.css': ['.card { margin: 0; }', '.card :global(.x) { margin: 0; }', ':global(.x) { margin: 0; }', ':global .y { margin: 0; }'].join('\n'),
  });
  const r = await proto.run();
  assert.deepEqual(summary(r.scopingErrors), ['unscoped-style@3', 'unscoped-style@4']);
});

test('a plain stylesheet must keep its rules inside @scope', async () => {
  const proto = makePrototype({
    'src/lib/card.css': ['@scope (.card) { p { margin: 0; } }', '.card { margin: 0; }', '@media (width > 40rem) { .card { margin: 0; } }'].join('\n'),
  });
  const r = await proto.run();
  assert.deepEqual(summary(r.scopingErrors), ['unscoped-style@2', 'unscoped-style@3']);
});

test('global stylesheet: element, :root and theme rules pass; component selectors leak; allowed classes pass', async () => {
  const css = [
    'html, body { margin: 0; }',
    ':root[data-theme="dark"] { color-scheme: dark; }',
    'h1, h2 { font-family: var(--ds-type-body-family); }',
    'a:hover { color: var(--ds-color-on-primary); }',
    '.visually-hidden { position: absolute; }',
    '.card { margin: 0; }',
    '[data-component="Button"] { margin: 0; }',
    '#app { margin: 0; }',
    'a:not(.button) { margin: 0; }',
    'html[data-theme="dark"] body { margin: 0; }',
    '@keyframes spin { from { transform: rotate(0); } to { transform: rotate(1turn); } }',
  ].join('\n');
  const proto = makePrototype(
    { 'src/styles/global.css': css },
    { config: { allowedGlobalClasses: [{ class: 'visually-hidden', for: 'Text for screen readers only' }] } },
  );
  const r = await proto.run();
  assert.deepEqual(r.scopingErrors.map((e) => `${e.line} ${e.detail}`), [
    '6 `.card` styles a component in the global stylesheet (`.card`).',
    '7 `[data-component="Button"]` styles a component in the global stylesheet (`[data-component]`).',
    '8 `#app` styles a component in the global stylesheet (`#app`).',
    '9 `a:not(.button)` styles a component in the global stylesheet (`.button`).',
  ]);
  // Value rules still apply in the global stylesheet; scoping errors never reach the backlog.
  assert.doesNotMatch(proto.backlog(), /global-component-leak/);
});

test('inline style attributes are not scoping errors, but their values are still checked', async () => {
  const proto = makePrototype({ 'src/lib/A.svelte': '<div style="color: #fff"></div>\n' });
  const r = await proto.run();
  assert.deepEqual(r.scopingErrors, []);
  assert.deepEqual(summary(r.deviations), ['hardcoded-color@1']);
});

// ---- Exit codes, backlog, config --------------------------------------------------------

test('exit codes: 0 with deviations, 1 with --strict, 1 on a scoping error', async () => {
  const proto = makePrototype({ 'src/lib/A.svelte': svelte('.a { padding: 20px; }') });
  assert.equal((await proto.run()).code, 0);
  assert.equal((await proto.run({ strict: true })).code, 1);
  proto.write('src/lib/B.vue', '<template><i/></template>\n<style>\ni { margin: 0; }\n</style>\n');
  assert.equal((await proto.run()).code, 1);
});

test('backlog: rationale carries forward across line moves, unchanged runs do not rewrite, fixed entries drop', async () => {
  const proto = makePrototype({ 'src/lib/A.svelte': svelte('.a { padding: 20px; color: #fff; }') });
  let r = await proto.run();
  assert.equal(r.changed, true);
  let text = proto.backlog();
  assert.match(text, /- \*\*L3 · raw-spacing\*\* — `padding: 20px` uses a raw length\.\n {2}- Rationale: Unknown — needs review/);

  // Write a two-line rationale by hand, then move the code down three lines.
  text = text.replace(
    /(raw-spacing\*\* — .*\n) {2}- Rationale: Unknown — needs review/,
    '$1  - Rationale: The card sits on a fixed grid the spacing scale\n    does not cover yet.',
  );
  (await import('node:fs')).writeFileSync(proto.backlogPath, text);
  proto.write('src/lib/A.svelte', svelte('\n\n\n.a { padding: 20px; color: #fff; }'));
  r = await proto.run();
  assert.equal(r.changed, true);
  text = proto.backlog();
  assert.match(text, /L6 · raw-spacing\*\* — `padding: 20px` uses a raw length\.\n {2}- Rationale: The card sits on a fixed grid the spacing scale\n {4}does not cover yet\./);

  r = await proto.run();
  assert.equal(r.changed, false);

  proto.write('src/lib/A.svelte', svelte('\n\n\n.a { padding: var(--ds-spacing-md); color: #fff; }'));
  await proto.run();
  assert.doesNotMatch(proto.backlog(), /raw-spacing|fixed grid/);
  assert.match(proto.backlog(), /\| `hardcoded-color` \| 1 \|/);
});

test('exemptions: a deviation rule can be exempted per file; a scoping rule cannot', async () => {
  const files = { 'src/styles/primitives.css': '@scope (.x) { p { color: #123456; } }' };
  const ok = makePrototype(files, { config: { exemptions: [{ files: ['src/styles/primitives.css'], rules: ['hardcoded-color'], why: 'Defines primitives the export lacks.' }] } });
  assert.deepEqual((await ok.run()).deviations, []);
  const bad = makePrototype(files, { config: { exemptions: [{ files: ['src/styles/primitives.css'], rules: ['unscoped-style'], why: 'no' }] } });
  const r = await bad.run();
  assert.equal(r.code, 2);
  assert.match(r.output, /Scoping errors can't be exempted/);
});

test('a placeholder namespace stops validate with a clear message', async () => {
  const r = await makePrototype({}, { usageMap: { namespace: '<prefix>', groups: [] } }).run();
  assert.equal(r.code, 2);
  assert.match(r.output, /namespace is still a placeholder/);
});

test('unparseable CSS stops validate and points to lint', async () => {
  const r = await makePrototype({ 'src/lib/broken.css': '@scope (.a) { p { color: red; ' }).run();
  assert.equal(r.code, 2);
  assert.match(r.output, /could not be parsed/);
});
