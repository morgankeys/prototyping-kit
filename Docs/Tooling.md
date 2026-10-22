# Tooling

A menu, not a manifest. The kit installs none of these; each is a tool a project in `Code/`
has found worth adding. Pick what fits your stack, wire it to a command role in
[`Code/README.md`](../Code/README.md), and record stack-specific quirks in that project's
`Code/ARCHITECTURE.md` (or the "Gotchas" heading in `Code/README.md`), not here.

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

- **Alpha is a separate field.** A color token's `hex` is 6-digit RGB only; opacity lives
  in `alpha`. Anything that reads only `hex` silently drops transparency. See
  [`Agents/skills/design-tokens/SKILL.md`](../Agents/skills/design-tokens/SKILL.md).
- Several collections share the filename `Baseline.tokens.json`, so unpack each zip into
  its own folder.
- Only `color`, `number`, and `string` `$type`s come out of the export.

### Style Dictionary

One option for turning token JSON into CSS custom properties. It reads the DTCG format
natively.

- **Needs a custom color transform.** The stock color transforms read `hex` and lose alpha.
  Write a transform that emits `rgb(r g b / a)` from `components` and `alpha` when
  `alpha < 1`.
- **Needs a regression guard.** Add a build-time assertion that every `alpha < 1` token
  comes out alpha-bearing, so an upgrade or refactor cannot drop it silently.
- Name transforms map Figma names with spaces and casing (`On Primary`) to the project's
  namespace (`--<prefix>-color-on-primary`).

Any other converter works if it meets the same two requirements.

### figma-capture-button

An npm package that adds a dev-only button to every page: click it, choose **Entire
screen** or **Select element**, then paste into Figma with ⌘V to get editable layers, not a
screenshot. Ctrl+C captures the entire screen without opening the menu.

- **Load it only in development** (behind the stack's dev-mode flag, via a dynamic import),
  and prove it is absent from the build: after `build`, search the output for
  `figma-capture` and expect nothing.
- **Network:** the capture is Figma's html-to-design script, which the button fetches from
  `mcp.figma.com` as it loads.
- Example: `Code/src/scripts/figma-capture.ts` in the example site.

### Figma MCP server

Lets an agent session read designs, variables, and screenshots straight from a Figma file,
and push captures back. Useful for implementing a page from the site file without
copy-pasting specs.

## Component catalog

Both tools hang off the component registry in
[`Docs/Design system/Guidelines/components.md`](Design%20system/Guidelines/components.md).
`/component-catalog` installs them once a stack exists; the contract is
[`Agents/context/component-catalog.md`](../Agents/context/component-catalog.md).

### Storybook

The default component workbench: every component and variant in isolation, wired to the
`stories` and `stories-build` roles. Supports React, Vue, Svelte, Angular, Web Components,
and more; its installer detects the framework.

- **Delete the installer's example stories.** They hardcode colors and spacing and add
  deviations to the backlog.
- **Load the real styles in the preview:** the global stylesheet and the generated token
  CSS, or stories won't look like the prototype.
- **The static build is a public site.** Keep it out of `Export/` and out of `build`.
- **MCP add-on** (`@storybook/addon-mcp`): lets agents query components and stories. React
  only, and in preview, at the time of writing.
- **`@storybook/addon-designs`** embeds a component's Figma frame in its story, a free
  design-to-code link when the Figma plan doesn't include Code Connect.
- **No Storybook:** a gallery page under the `dev/` pages folder meets the same contract
  with no dependency.

### Figma Code Connect

Maps code components to Figma components, so Dev Mode and the Figma MCP server show this
project's components instead of generic markup. Wired to the `connect` role.

- **Parsers by stack:** `react` (React, React Native), `html` (Web Components, Angular,
  Vue), `swift`, `compose`. Other stacks use template files (`.figma.js` or `.figma.ts`)
  with `label` and `language` set in `figma.config.json`.
- **Publishing needs an Organization or Enterprise plan** and a personal access token
  (`FIGMA_ACCESS_TOKEN`, server-side only). Publish locally; let CI only validate, with
  `--exit-on-unreadable-files`.
- **Needs a Figma library.** Without one there is nothing to map; see "Not using Figma?"
  in the contract to switch it off.
- Docs: [developers.figma.com/docs/code-connect](https://developers.figma.com/docs/code-connect/).

## Enforcement (any stack)

### Stylelint + `stylelint-declaration-strict-value`

Forces color, spacing, radius, and typography properties to use `var(…)` instead of
literals, including the color inside `border*`, `outline`, and `background` shorthands.

- **The allowlist must carry both `currentcolor` and `currentColor`.** The plugin matches
  `ignoreValues` case-sensitively while the standard config requires the lowercase
  spelling; with only one, the two rules contradict each other and no spelling passes.
- The plugin accepts any function call, so literals inside `rgb()`, `calc()`, gradients,
  and `var()` fallbacks still need the validator.
- Parsing styles inside component files depends on the framework (a custom syntax for
  single-file components); plain `.css` files must keep the default parser.

### Design-system validator

A script that implements the validator contract in
[`Docs/Design system/design-in-code architecture.md`](Design%20system/design-in-code%20architecture.md)
and writes the deviations backlog. Example: `Code/scripts/ds-validate.mjs` in the example
site.

### Prettier + ESLint

Formatting and code lint. **Ignore the generated token CSS in every linter config**
(Prettier, ESLint, Stylelint), or each regeneration produces noise and lint failures in
files nobody may hand-edit.

### `git diff --exit-code` in CI

Run after `build` and `validate`. Fails the job when a tracked generated file (the unpacked
token JSON, the deviations backlog) is stale, without failing on deviations themselves.

### `git merge-tree --write-tree`

Tests whether two branches merge cleanly without touching the working tree. The
[`/pr` skill](../Agents/skills/pr/SKILL.md) uses it to check a branch against its base and
against other open work.
