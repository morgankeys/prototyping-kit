---
name: design-validator
description: Install the template's reference design-system validator into Code/ and wire the validate role. Copies the tested Stylelint-based validator from this skill, installs its pinned dependencies, fills in its config for the stack (global stylesheet, token files, manifest, component file types), runs it, and records the setup in Code/ARCHITECTURE.md. Use when the user invokes /design-validator, when /setup reaches the ds-validator item, when validate has no real command yet, or when the validator needs adapting to a new framework.
---

# /design-validator

Installs `validate` in a prototype: the design-system validator that writes the deviations
backlog and fails on scoping errors. The rules it implements are the contract in
[`design-in-code architecture.md`](../../../Docs/Design%20system/design-in-code%20architecture.md#validator-contract);
this skill holds the install steps only.

The validator is already written and tested here, in [`template/`](template/). A prototype gets
a copy in `Code/` and owns it from then on. Safe to rerun: it never overwrites a
prototype's copy
without asking.

**Read [`guiding-users.md`](../../context/guiding-users.md) before you start.** All of
this is agent work. The user's part is two decisions at most, both in step 4: which styles
are meant to be global, and any exemption. Ask them in design terms.

## What is in `template/`

| Path (copied into `Code/`) | What it is |
| --- | --- |
| `scripts/ds-validate/validate.mjs` | The `validate` command. Runs the rules, writes the backlog, prints a summary, sets the exit code. |
| `scripts/ds-validate/plugin.mjs` | One Stylelint rule per contract rule (`ds/<rule id>`). |
| `scripts/ds-validate/settings.mjs` | Reads the config, the usage map, and the manifest; sorts files into token files, the global stylesheet, components, and plain stylesheets. |
| `scripts/ds-validate/backlog.mjs` | Writes the backlog and carries `Rationale:` lines forward. |
| `scripts/ds-validate/stylelint-config.mjs`, `lib/` | The shared Stylelint config, pattern and value helpers. |
| `ds-validate.config.json` | The project's settings. Every key is explained in the file. |
| `stylelint.design-system.config.mjs` | Optional. The same rules for the editor ([`/editor-setup`](../editor-setup/SKILL.md)). |

It handles Svelte, Vue, and Astro components, CSS modules, and plain stylesheets that
scope with `@scope`. The tested dependency versions are in [`package.json`](package.json)
here; use those.

## Steps

### 1. Check what it needs

- **A stack** in `Code/` with a project manifest (`stack-choice`). The validator runs on
  Node 22.22 or later as a dev tool, whatever the stack. If the project can't use Node at
  all, stop and write a validator in the stack's language against the contract instead.
- **The token namespace** recorded as `namespace` in
  [`token-usage.json`](../../../Docs/Design%20system/token-usage.json). The validator
  refuses to run while it is still `<prefix>`.
- **The token pipeline** (`tokens-pipeline`), so the generated token CSS and the token
  manifest exist. Without the manifest the validator still runs, with Figma scope checks
  off, and says so.
- **Existing copy.** If `Code/scripts/ds-validate/` already exists, compare it with
  `template/`. The prototype may have adapted it; never overwrite local changes without asking.

### 2. Copy and install

Copy `template/scripts/ds-validate/` to `Code/scripts/ds-validate/` and
`template/ds-validate.config.json` to `Code/`. Copy `stylelint.design-system.config.mjs`
only if the user wants design-system hints in their editor; set its `extends` to `lint`'s
Stylelint config file.

Add these dev dependencies to `Code/` with the project's package manager, at the exact
versions in this folder's `package.json`: `stylelint`, `postcss-value-parser`,
`postcss-selector-parser`, and `postcss-html` when the project has `.svelte`, `.vue`, or
`.astro` files. If `lint` already uses Stylelint, keep one version for both.

### 3. Fill in the config

Edit `Code/ds-validate.config.json` for this project. Paths are relative to `Code/`.

- `include`: where styles live (component files and stylesheets). `ignore`: build output
  and anything generated besides tokens.
- `tokenFiles`: the generated token CSS from `tokens`. `manifest`: the token manifest.
- `globalStylesheets`: the one global stylesheet. If the project has none yet, create a
  minimal one (element defaults and type settings only) and load it once at the root.
- `allowedVariables`: CSS variables a framework or tool sets itself, such as `--tw-*`.
- Leave `allowedGlobalClasses` and `exemptions` empty unless step 4 fills them.

### 4. Run it and settle the first findings

Run `validate` (step 5 wires the command; until then, `node scripts/ds-validate/validate.mjs`
from `Code/`).

- **Scoping errors** fail the run. Fix each by moving the style to its home ("Fixing a
  scoping error" in
  [Scoping: global or component](../../../Docs/Design%20system/design-in-code%20architecture.md#scoping-global-or-component)).
  When it is unclear whether a style should apply everywhere, ask the user, in their
  terms: "Should this heading style apply on every page, or only in the card?" A utility
  class that really is for use anywhere goes in `allowedGlobalClasses` only once the
  design-system owner agrees.
- **Deviations** go to the backlog. Work through it as
  ["Working a deviation"](../../../Docs/Design%20system/design-in-code%20architecture.md#working-a-deviation)
  says: use a token where one fits, otherwise write your best guess on each `Rationale:`
  line.
- **Exemptions** are for files that must break a deviation rule on purpose, such as one
  that defines primitives the export lacks. Each needs `why`, and the owner agrees first.
  Scoping errors can't be exempted.
- **A warning about a usage-map group** that matches no token means the map is out of
  date; tell the owner, don't edit the map to silence it.

### 5. Wire the role

- Add a `validate` script to `Code/`'s manifest that runs
  `node scripts/ds-validate/validate.mjs` (it passes `--strict` through), and put the real
  command in the `validate` row in [`Code/README.md`](../../../Code/README.md).
- Replace the `validate` placeholder in
  [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml). CI runs it without
  `--strict`, then `git diff --exit-code` catches a stale backlog.
- Commit `Docs/Design system/deviations-backlog.md`.

### 6. Record it

In [`Code/ARCHITECTURE.md`](../../../Code/ARCHITECTURE.md):

- **Validation:** the validator is the reference build in `Code/scripts/ds-validate/`,
  configured in `Code/ds-validate.config.json`; which component file types it reads; where
  the manifest is; any exemptions and why; and any change made to the copy for this stack.
- **Styling Rules:** which file is the global stylesheet, and that the allowed global
  classes list is `allowedGlobalClasses` in the config.

Done when the `ds-validator` item in the [setup checklist](../setup/checklist.md) says so.

## Adapting it to another framework

A framework with its own component file type (anything other than Svelte, Vue, Astro, or
CSS modules) needs two small changes in the prototype's copy: map the file extension to a
framework in `COMPONENT_EXTENSIONS` (`settings.mjs`), and say how that framework marks a
style block as not scoped in `blockScope` (`plugin.mjs`). Styles written in JavaScript
(CSS-in-JS) are not CSS files Stylelint can read without a custom syntax; check that one
exists for the library before promising coverage.

Utility classes written in markup (Tailwind and the like) are not CSS the validator sees.
Say so in `Code/ARCHITECTURE.md` rather than implying they are checked.

## Changing the reference build (template only)

The validator here and its contract change together. A change to the contract's rules
changes [`template/`](template/) and [`test/`](test/) in the same pull request. Run the
tests from this folder:

```bash
npm ci && npm test
```

Add a test for every rule change, with a fixture that fails without it.
