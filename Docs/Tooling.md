# Tooling

A menu, not a manifest. The kit installs none of these; each is a tool a project in `Code/`
has found worth adding. Pick what fits your stack, wire it to a command role in
[`Code/README.md`](../Code/README.md), and record stack-specific quirks in that project's
`Code/ARCHITECTURE.md` (or the "Gotchas" heading in `Code/README.md`), not here.

Which of these a kit needs, which are optional, and what each waits on is in the
[setup checklist](../Agents/skills/setup/checklist.md). `/setup` walks through them and
records any the project skips.

Worked examples below come from one project built on this kit, the kit owner's portfolio
site (`morgankeys/morgankeysdotcomv3`). They are references to read, not files to copy in
unchanged.

## Design ↔ code

The kit needs a source of truth for tokens. The default path is
**Figma → tokens → prototype → capture back to Figma**.

A team can instead keep tokens in this kit or a separate repository and feed both the
prototype and Figma, or use another design tool, as long as the tokens land in this kit.
The tools below are the Figma path.

### Figma variables export

Figma exports variable collections as DTCG-style JSON, one zip per collection, dropped in
`Docs/Design system/Figma/Tokens/`.

- **Alpha is a separate field** from `hex`, and easy to drop. See
  ["the alpha gotcha"](../Agents/skills/design-tokens/SKILL.md#critical-the-alpha-gotcha).
- Several collections share the filename `Baseline.tokens.json`, so unpack each zip into
  its own folder.
- Only `color`, `number`, and `string` `$type`s come out of the export.
- Nothing to install: the export is built into Figma's variables panel. Docs:
  [Guide to variables in Figma](https://help.figma.com/hc/en-us/articles/15339657135383).
- **Scopes and descriptions come along.** Each variable's `$extensions` carries
  `com.figma.scopes` (where it may be applied) and its `$description`. Most converters
  ignore `$extensions`; read them explicitly to write the token manifest that `validate`
  uses to check intended use.

### Style Dictionary

One option for turning token JSON into CSS custom properties. It reads the DTCG format
natively.

- **Needs a custom color transform and a regression guard.** The stock color transforms
  lose alpha. Both requirements are specified in
  ["the alpha gotcha"](../Agents/skills/design-tokens/SKILL.md#critical-the-alpha-gotcha).
- Name transforms map Figma names with spaces and casing (`On Primary`) to the project's
  namespace (`--<prefix>-color-on-primary`).

Any other converter works if it meets the same two requirements.

Get it: npm [`style-dictionary`](https://www.npmjs.com/package/style-dictionary) ·
[styledictionary.com](https://styledictionary.com/) ·
[source](https://github.com/style-dictionary/style-dictionary).

### figma-capture-button

An npm package that adds a dev-only button to every page: click it, choose **Entire
screen** or **Select element**, then paste into Figma with ⌘V to get editable layers, not a
screenshot. Ctrl+C captures the entire screen without opening the menu.

- **Load it only in development** (behind the stack's dev-mode flag, via a dynamic import),
  and prove it is absent from the build: after `build`, search the output for
  `figma-capture` and expect nothing.
- **Network:** the capture is Figma's html-to-design script, which the button fetches from
  `mcp.figma.com` as it loads.
- The package gates itself to `localhost`, but the kit still requires the dev-only import
  and the build check above.
- Example: `Code/src/scripts/figma-capture.ts` in the example site.

Get it: npm [`figma-capture-button`](https://www.npmjs.com/package/figma-capture-button) ·
[source and usage](https://github.com/Anna-Arteeva/figma-capture-button).

### Figma MCP server

Lets an agent session read designs, variables, and screenshots straight from a Figma file,
and push captures back. Useful for implementing a page from the site file without
copy-pasting specs.

- It is connected to the agent tool, not installed in `Code/`. The remote server is
  `https://mcp.figma.com/mcp`; the user signs in with their Figma account the first time.
  In Claude Code: `claude mcp add --transport http figma https://mcp.figma.com/mcp`.
- Keep any MCP config that holds a token out of git (`.cursor/` is ignored apart from
  rules and skills for this reason).
- Figma also publishes agent skills for the server (design to code, Code Connect, and
  more). Load one when the task matches.

Get it: [developer docs](https://developers.figma.com/docs/figma-mcp-server/) ·
[remote server setup, per client](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/) ·
[help center guide](https://help.figma.com/hc/en-us/articles/32132100833559).

## Component catalog

Facts about the tools themselves. The rules they must follow are in
[`Agents/context/component-catalog.md`](../Agents/context/component-catalog.md), and
`/component-catalog` installs them once a stack exists.

### Storybook

The default component workbench: every component and variant in isolation, wired to the
`stories` and `stories-build` roles. Supports React, Vue, Svelte, Angular, Web Components,
and more; its installer detects the framework.

- **Delete the installer's example stories.** They hardcode colors and spacing and add
  deviations to the backlog.
- **MCP add-on** ([`@storybook/addon-mcp`](https://storybook.js.org/addons/@storybook/addon-mcp),
  [docs](https://storybook.js.org/docs/ai/mcp/overview)): lets agents query components and
  stories, write stories, and run their tests. Optional. Its docs toolset needs a
  components manifest, which only some frameworks generate (React, and the Vite builds of
  Angular and Vue 3, when last checked in November 2026); check the docs for the stack
  before adding it.
- **[`@storybook/addon-designs`](https://storybook.js.org/addons/@storybook/addon-designs)**
  ([source](https://github.com/storybookjs/addon-designs)) embeds a component's Figma
  frame in its story, a free design-to-code link when the Figma plan doesn't include Code
  Connect. Optional.

Get it: `npx storybook@latest init` from `Code/` · [docs](https://storybook.js.org/docs).

### Figma Code Connect

Maps code components to Figma components, so Dev Mode and the Figma MCP server show this
project's components instead of generic markup. Wired to the `connect` role.

- **Setup by stack:**

  | Stack | Setup |
  | --- | --- |
  | React, React Native | `react` parser |
  | Web Components, Angular, Vue, plain HTML | `html` parser |
  | SwiftUI | `swift` parser |
  | Jetpack Compose | `compose` parser |
  | Anything else (Svelte, Solid, …) | Template files (`.figma.js` or `.figma.ts`), with `label` and `language` set in `figma.config.json` so Figma highlights the snippet |

- **Commands:** `figma connect parse` or `figma connect publish --dry-run` validate
  without publishing; `figma connect publish` publishes. In CI, pass
  `--exit-on-unreadable-files`.
- **Publishing needs an Organization or Enterprise plan** and a personal access token
  (`FIGMA_ACCESS_TOKEN`, server-side only).
- **Two kinds of component.** Core components come from the library file; project-specific
  ones are designed in the site file. Both are mapped the same way, each to the node in
  the file where its main component lives.
- The token is a Figma [personal access token](https://help.figma.com/hc/en-us/articles/8085703771159).

Get it: npm [`@figma/code-connect`](https://www.npmjs.com/package/@figma/code-connect) ·
[docs](https://developers.figma.com/docs/code-connect/) ·
[source](https://github.com/figma/code-connect) ·
[help center](https://help.figma.com/hc/en-us/articles/23920389749655).

## Enforcement (any stack)

### Stylelint

CSS validity: syntax errors, unknown properties, invalid values, through
`stylelint-config-standard`. Part of `lint`, where its findings are errors. It is also the
default engine for `validate`, under a separate config (see
[Design-system validator](#design-system-validator)).

- **`lint`'s config does not check token use.** Hardcoded colors, spacing, radius, and
  typography are design-system findings, and `validate` owns those (see
  [Validation and linting](Design%20system/design-in-code%20architecture.md#validation-and-linting)).
- **`stylelint-declaration-strict-value` is not part of the kit.** The plugin forces
  `var(…)` in chosen properties, which reports the validator's findings a second time, as
  errors that fail `lint` even when the deviation is logged with a rationale. It is also
  the weaker check: it accepts any function call, so literals inside `rgb()`, `calc()`,
  gradients, and `var()` fallbacks pass. For hints in the editor, use the validator's own
  rules instead (below).
- Parsing styles inside component files depends on the framework (a custom syntax for
  single-file components); plain `.css` files must keep the default parser.

Get it: [stylelint.io](https://stylelint.io/) · npm
[`stylelint`](https://www.npmjs.com/package/stylelint),
[`stylelint-config-standard`](https://www.npmjs.com/package/stylelint-config-standard).

### Design-system validator

A script that implements the validator contract in
[`Docs/Design system/design-in-code architecture.md`](Design%20system/design-in-code%20architecture.md)
and writes the deviations backlog. It is the only check that reports design-system
findings.

**Default build, on a stack with Node: the contract's rules as custom Stylelint rules,
run by a small wrapper.** Stylelint already finds the files, parses CSS and the style
blocks inside component files, and splits values (`calc()`, gradients, `var()`
fallbacks). A hand-written parser repeats that work, and it is where missed findings hide.

- **The rules.** One custom rule per rule in the contract and per token usage rule, in a
  Stylelint plugin the project keeps in `Code/`. Each reads the token manifest and
  `token-usage.json`. Rule ids match the contract's, because rationale is matched on them.
- **Their own config.** A design-system config extends `lint`'s Stylelint config and adds
  the custom rules at warning severity. `lint`'s config never loads them.
- **The wrapper is `validate`.** It runs Stylelint through its Node API (`stylelint.lint`)
  with the design-system config, keeps only results from the custom rules, and maps each
  to a backlog entry. It adds the checks that are not about one file (`token-unclassified`,
  and the warning for a usage-map group that matches no token), carries rationale forward,
  writes the backlog only when it changes, and sets the exit code itself: 0 with
  deviations present, 1 on any scoping error, 1 on any deviation under `--strict`.
  Stylelint's own exit code never decides it.
- **Check `unscoped-style` per framework.** Whether a style block is scoped depends on the
  framework (a `scoped` attribute, CSS modules, a compiler default), and the parser for
  component files may not expose it. Where a rule can't see it, do that check in the
  wrapper. `global-component-leak` reads the allowed global classes list from wherever
  the project keeps it.
- **Editor hints, optional.** Point the editor's Stylelint extension at the design-system
  config (in VS Code, the `stylelint.configFile` setting) to see CSS errors and the
  validator's findings while editing. Nothing in `lint` changes.
  [`/editor-setup`](../Agents/skills/editor-setup/SKILL.md) offers this when it applies.
- On a stack without Node, write the validator in the stack's language against the same
  contract.

Example: `Code/scripts/ds-validate.mjs` in the example site, which predates this default.

### Prettier + ESLint

Formatting and code lint, both part of `lint`. **Ignore the generated token CSS in every linter config**
(Prettier, ESLint, Stylelint), or each regeneration produces noise and lint failures in
files nobody may hand-edit.

Get them: [prettier.io](https://prettier.io/) · [eslint.org](https://eslint.org/). Add the
framework's own plugins for each (its file types and template syntax).

### `git diff --exit-code` in CI

Run after `build` and `validate`. Fails the job when a tracked generated file (the unpacked
token JSON, the deviations backlog) is stale, without failing on deviations themselves.

### `git merge-tree --write-tree`

Tests whether two branches merge cleanly without touching the working tree. The
[`/pr` skill](../Agents/skills/pr/SKILL.md) uses it to check a branch against its base and
against other open work.

## Editor

What each editor needs so the kit's files look right: highlighting for every file type,
and the project's linters shown as underlines. The
[`/editor-setup` skill](../Agents/skills/editor-setup/SKILL.md) applies it. Every extension
id below was confirmed on both the Visual Studio Marketplace and Open VSX on 2026-11-19;
ids can change, so confirm again before adding one.

### VS Code and Cursor

Cursor is built on VS Code and reads the same project files.

- **Project files.** `.vscode/extensions.json` lists `recommendations`, which the editor
  offers to install when the folder is opened. `.vscode/settings.json` holds workspace
  settings. Both are read only from the folder that is open, so open the kit's root.
- **Where extensions come from.** VS Code uses the
  [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode); Cursor uses
  [Open VSX](https://open-vsx.org/), so confirm an id is published there too. Each has a
  command-line installer: `code --install-extension <id>`, `cursor --install-extension <id>`.
- **Built in:** HTML, CSS, JavaScript, TypeScript (including JSX and TSX), JSON, Markdown.
- **Language extensions:** Svelte `svelte.svelte-vscode`, Vue `Vue.volar`, Astro
  `astro-build.astro-vscode`, MDX `unifiedjs.vscode-mdx`, Tailwind CSS
  `bradlc.vscode-tailwindcss`.
- **Stylelint** `stylelint.vscode-stylelint`
  ([settings](https://github.com/stylelint/vscode-stylelint#extension-settings)):
  - `stylelint.validate` lists the language ids to check; the default is only `css` and
    `postcss`. Add each one `lint` checks, such as `svelte`, `vue`, or `astro`.
  - Turn off the editor's own CSS checks (`css.validate`, `less.validate`,
    `scss.validate`) so the same line doesn't get two different messages.
  - `stylelint.configFile` loads one config file instead of searching for one. The
    extension documents `${workspaceFolder}` for some path settings but not this one;
    test a path before relying on it.
  - Tested against Stylelint 14 to 18.
- **ESLint** `dbaeumer.vscode-eslint`. When the config and dependencies live in `Code/`
  rather than the open folder, set `eslint.workingDirectories` to `["./Code"]`.
- **Prettier** `esbenp.prettier-vscode`. Set it as `editor.defaultFormatter` for the file
  types it formats. `editor.formatOnSave` rewrites files on save, so it is the user's
  choice.

### JetBrains IDEs (WebStorm and others)

Stylelint, ESLint, and Prettier support is built in and turned on per project in Settings.
Vue support is bundled; Svelte and Astro come as plugins from the JetBrains Marketplace.
Project settings live in `.idea/`, which is mostly personal; the kit doesn't commit it.

### Zed

Language support for frameworks comes from Zed's extensions panel. Project settings go in
`.zed/settings.json` at the kit's root.
