# Setup checklist

The canonical list of everything a prototype needs before it is fully set up: tools to install,
configuration to write, decisions to record, and stubs to fill in. `/setup`
([`SKILL.md`](SKILL.md)) reads this file, checks the repo against it, and reports what is
left.

It is written for agents. Ids, levels, and role names are working notes; when talking to
the user, follow [`guiding-users.md`](../../context/guiding-users.md).

**This file holds definitions only. Never tick anything off here.** Each prototype's progress
lives in `Docs/setup-status.md`, one row per item id below, written by `/setup`. Keeping
the two apart means this file can be replaced with a newer version without losing a prototype's
progress: a new item simply shows up as a new row.

Rules and tool facts are not restated here. Each item links to the file that owns them:
rules in `Agents/context/`, procedures in `Agents/skills/`, tools (with where to get them)
in [`Docs/Tooling.md`](../../../Docs/Tooling.md).

## How to read an item

| Column | Meaning |
| --- | --- |
| **Item** | Stable id. Never rename one; status rows are matched on it. |
| **Who** | `user`: only a person can do it (a decision, an account, a file from Figma). `agent`: an agent does it once its inputs exist. `both`: the user decides or supplies something, then the agent does the work. |
| **Level** | `required`: a rule or check depends on it, so it can't be opted out of. The tool that does the job can still be swapped for an equivalent. `default`: set up unless the user opts out. `optional`: offered once, set up only if the user opts in. `anytime`: content that fills in as the project goes; reported, never a blocker. |
| **Needs** | Items that must be `done` first. An item whose needs aren't met is `waiting`, not `todo`. |
| **Done when** | What to check in the repo. *Ask* means it can't be seen from the repo: take the user's word and record the date. |

Every `figma-*` item is `n/a` when the project says `Figma: not used` (see `prototype-figma`).

Commands are named by role; [`Code/README.md`](../../../Code/README.md) maps each role to
the real command.

## 1. Prototype

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `prototype-provenance` | Record where the prototype came from ([provenance](../../context/repo-structure.md#provenance)). | agent | required | | The root `README.md` has a `Created from prototyping-kit @` line (`Forked from` in older kits), and the repo has no `new-prototype.sh`, no `.github/workflows/template.yml` or `.github/template-checks/`, and no `template-only` blocks. |
| `prototype-figma` | Decide whether the project uses Figma, and record the site and library file links, or `Figma: not used` ([Figma sources](../../context/design-system.md#figma-sources)). | user | required | | Both [`Agents/context/design-system.md`](../../context/design-system.md) and [`Docs/Design system/README.md`](../../../Docs/Design%20system/README.md) hold real links or `Figma: not used`, and they agree. |
| `prototype-github` | Create `staging`, and apply the repo settings and rulesets in [`Docs/github.md`](../../../Docs/github.md). | user | default | | A `staging` branch exists on the remote. Settings and rulesets: *ask*; agents can't see them. |

## 2. Stack

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `stack-choice` | Pick the stack for `Code/` and scaffold it. | both | required | | `Code/` has a project manifest, and "Stack" in [`Code/ARCHITECTURE.md`](../../../Code/ARCHITECTURE.md) names the framework, language, and styling approach. |
| `stack-commands` | Fill in the command table and Quick Start in [`Code/README.md`](../../../Code/README.md). | agent | required | `stack-choice` | `dev` and `build` have real commands, `check` has one or `n/a`, the dev port is a number, and Quick Start has real commands. |
| `stack-gitignore` | Ignore the stack's dependency folders, build output, and caches in `.gitignore`. | agent | required | `stack-choice` | After an install and a `build`, `git status` shows no dependency or build files. |
| `stack-dev-guard` | Keep dev-only pages out of every build, with a guard that fails the build if one leaks ([contract](../../context/dev-only-pages.md)). | agent | required | `stack-choice` | A `dev/` pages folder is excluded from `build`, `build` runs the guard, and "Dev-only pages guard" in `Code/ARCHITECTURE.md` describes both. |
| `stack-architecture` | Fill in `Code/ARCHITECTURE.md`. | agent | required | `stack-choice` | No section is still only its template comment, apart from sections for pieces that are opted out or `waiting`. |
| `stack-ci` | Replace the placeholders in [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) with real commands. | agent | default | `stack-commands` | No step whose role has a real command still echoes `TODO`. Steps for roles the project will never use (opted out or `n/a`) are deleted, not left as placeholders. |
| `stack-editor` | Set up the user's editor so every file type in `Code/` is highlighted and the project's linters show as underlines ([`/editor-setup`](../editor-setup/SKILL.md)). | both | default | `stack-choice`, `lint-role` | The user says their files look right. For VS Code or Cursor, `.vscode/extensions.json` also recommends an extension for each file type and linter that needs one. |

## 3. Tokens

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `tokens-source` | Bring in the token source. Default: export each variable collection from the Figma library file and drop the zips in `Docs/Design system/Figma/Tokens/` ([Figma variables export](../../../Docs/Tooling.md#figma-variables-export)). | user | required | `prototype-figma` | The folder holds at least one export `.zip`, or `Agents/context/design-system.md` says where tokens are maintained and they are stored under `Docs/Design system/`. |
| `tokens-pipeline` | Install a token converter ([Style Dictionary](../../../Docs/Tooling.md#style-dictionary) by default) and wire the `tokens` role ([design-tokens skill](../design-tokens/SKILL.md)). | agent | required | `tokens-source`, `stack-choice` | `tokens` has a real command; each collection is unpacked into its own tracked folder; the generated token CSS exists with a generated-file header; the token manifest is written; `build` runs `tokens` first. |
| `tokens-alpha-guard` | Preserve alpha in the color transform and add the regression guard ([the alpha gotcha](../design-tokens/SKILL.md#critical-the-alpha-gotcha)). | agent | required | `tokens-pipeline` | `build` runs an assertion that fails when a source token with `alpha < 1` is emitted without alpha, and every such token in the generated CSS is alpha-bearing. |
| `tokens-namespace` | Record the token namespace. | agent | required | `tokens-pipeline` | "Styling rules" in `Agents/context/design-system.md` names the real prefix and its groups, and `namespace` in [`token-usage.json`](../../../Docs/Design%20system/token-usage.json) matches. |
| `tokens-usage-map` | Replace the example groups in `token-usage.json` with this project's ([Token usage](../../../Docs/Design%20system/design-in-code%20architecture.md#token-usage)). The agent proposes; the design-system owner decides. | both | default | `tokens-pipeline`, `ds-validator` | The "starting example" note is gone from the file, and `validate` prints no warning for a group that matches no token. |

## 4. Enforcement

The checks always run; none can be skipped. Agents fix technical findings themselves; the
user decides what to do about design findings, not whether to look (see "Operating notes" in [`AGENTS.md`](../../../AGENTS.md)).
Design findings come only from `validate`; `lint` is technical
([Validation and linting](../../../Docs/Design%20system/design-in-code%20architecture.md#validation-and-linting)).

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `ds-validator` | Install the reference design-system validator with [`/design-validator`](../design-validator/SKILL.md), or write one to the [validator contract](../../../Docs/Design%20system/design-in-code%20architecture.md#validator-contract), and wire the `validate` role ([tool notes](../../../Docs/Tooling.md#design-system-validator)). | agent | required | `stack-choice`, `tokens-pipeline`, `tokens-namespace`, `lint-stylelint` | `validate` has a real command, exits 0 with deviations present, exits 1 on a scoping error (with an allowed global classes list in place, even if empty), `validate --strict` exits 1 on any deviation, `Docs/Design system/deviations-backlog.md` exists and is committed, and `lint`'s config does not load the validator's rules. |
| `lint-stylelint` | [Stylelint](../../../Docs/Tooling.md#stylelint) with the standard config, for CSS validity (syntax, unknown properties, invalid values). Token use is not its job: `validate` owns that. | agent | required | `stack-choice` | `stylelint` and `stylelint-config-standard` are dev dependencies with a config, `lint` runs it, and no rule in the config fails `lint` over a hardcoded value. |
| `lint-prettier` | [Prettier](../../../Docs/Tooling.md#prettier--eslint) for formatting. | agent | required | `stack-choice` | It is a dev dependency with a config, and `lint` runs its check. |
| `lint-eslint` | [ESLint](../../../Docs/Tooling.md#prettier--eslint) for code lint. | agent | required | `stack-choice` | It is a dev dependency with a config, and `lint` runs it. |
| `lint-role` | Wire the `lint` role, and keep generated files out of every linter. | agent | required | `stack-choice` | `lint` has a real command that runs all three, and each linter ignores the generated token CSS and the workbench's static output. |

## 5. Figma tools

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `figma-mcp` | Connect the [Figma MCP server](../../../Docs/Tooling.md#figma-mcp-server) to the agent tool in use, so agents can read the files and push captures back. Signing in is the user's step. | user | default | `prototype-figma` | A Figma MCP tool answers in this session (for example, reading the library file). If none is available here, *ask*. |
| `figma-registry` | List the library's components in the [component registry](../../../Docs/Design%20system/Guidelines/components.md), with node links and variant properties ([registry rules](../../context/component-catalog.md#the-registry)). | agent | default | `figma-mcp` | The registry has real rows for the library's components and the placeholder row is gone. |
| `figma-capture` | Add [figma-capture-button](../../../Docs/Tooling.md#figma-capture-button), loaded only in development. | agent | default | `stack-choice` | It is a dev dependency, loaded behind the stack's dev-mode flag, and a search of the `build` output for `figma-capture` finds nothing. |

## 6. Component catalog

All of these are done by [`/component-catalog`](../component-catalog/SKILL.md), which is
safe to rerun. Rules: [`component-catalog.md`](../../context/component-catalog.md).

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `catalog-workbench` | Turn on the component workbench ([Storybook](../../../Docs/Tooling.md#storybook) by default). | agent | default | `stack-choice`, and at least one component in `Code/` | `stories` and `stories-build` have real commands, the installer's example stories are gone, and the preview loads the global stylesheet and token CSS. |
| `catalog-stories` | A story for every component. | agent | default | `catalog-workbench` | Every registry row with a code path has a story id, and `stories-build` passes. |
| `catalog-addon-mcp` | Storybook's MCP add-on (`@storybook/addon-mcp`), so agents can query components and stories. | agent | optional | `catalog-workbench` | It is listed in the workbench's add-ons and pinned. |
| `figma-addon-designs` | `@storybook/addon-designs`, to embed each component's Figma frame in its story. Offer it when Code Connect can't be published on the project's Figma plan. | agent | optional | `catalog-workbench`, `prototype-figma` | It is listed in the workbench's add-ons, and stories with a Figma node link carry it. |
| `figma-connect-setup` | Install and configure [Figma Code Connect](../../../Docs/Tooling.md#figma-code-connect). | agent | default | `stack-choice`, `prototype-figma`, and at least one component in `Code/` | `@figma/code-connect` is a pinned dev dependency, `Code/figma.config.json` exists, `connect` has a real command, and `FIGMA_ACCESS_TOKEN` is uncommented in `Code/.env.example`. |
| `figma-connect-core` | Code Connect mappings for core components: the ones that come from the library file. | agent | default | `figma-connect-setup`, `figma-registry` | Every registry row with a code path and a library node link has `✓` under Code Connect, and `connect` passes. |
| `figma-connect-project` | Code Connect mappings for project-specific components: built for this prototype and designed in the site file, not the library. | agent | default | `figma-connect-setup` | Every such component has a registry row with a site-file node link and `✓` under Code Connect, or its Figma column is empty because it has no Figma counterpart. |
| `figma-connect-publish` | Publish the mappings: check the [plan requirement](../../../Docs/Tooling.md#figma-code-connect), put a personal access token in `Code/.env`, run `connect --publish`. Agents never publish. | user | default | `figma-connect-core` | *Ask.* |

## 7. Content

Fills in as the project goes. `/setup` reports these in one short list after everything
else and never treats them as blockers ("Unfilled is fine": see
[`Guidelines/README.md`](../../../Docs/Design%20system/Guidelines/README.md)).

| Item | What | Who | Level | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| `content-ds-summary` | Summarize the design system at the top of `Docs/Design system/README.md`. | both | anytime | `tokens-namespace` | The summary comment is replaced with real text. |
| `content-guidelines` | Fill in the guideline files in `Docs/Design system/Guidelines/`. | both | anytime | | Report how many of the files are still stubs; there is no finish line. |
| `content-supplemental` | List tokens and assets that aren't Figma variables in [`Supplemental/README.md`](../../../Docs/Design%20system/Supplemental/README.md). | both | anytime | | The list comment is replaced, or the user says there are none. |
| `content-personas` | Replace the example user and org in `Docs/Personas/` with real ones, or delete them. | user | anytime | | No `EXAMPLE USER` or `EXAMPLE ORG` folder is left, and the two list files name real entries or say there are none. |

Exporting the design system (`/export-design-md`, the design-system export skill) is done
as needed, so it isn't a setup item and isn't tracked.

## Stubs

Every placeholder the template ships with, and the item that fills it in. A stub is **open**
while its file still contains the marker text. `scripts/setup-scan.mjs` reads this table,
so the marker must be copied exactly from the file and must not contain a `|`.

A marker that is still present after its item is `done` means the item isn't done. Three
markers are shared, because several items fill in the same table or file: `stub-commands`
(the `lint`, `tokens`, and `validate` rows belong to `lint-role`, `tokens-pipeline`, and
`ds-validator`), `stub-catalog-roles` (the `connect` row belongs to `figma-connect-setup`),
and `stub-ci` (each step belongs to the item that wires its role). For those, use the line
numbers the scan prints to see whose lines are left. A stub
that is open because its piece is opted out or `n/a` should be deleted from its file, not
left as a placeholder; `/setup` offers to do that.

When you add a placeholder to the template, add its row here in the same change.

| Stub | File | Marker | Item |
| --- | --- | --- | --- |
| `stub-figma-site-agents` | `Agents/context/design-system.md` | `<Figma link to the site file>` | `prototype-figma` |
| `stub-figma-library-agents` | `Agents/context/design-system.md` | `<Figma link to the library file>` | `prototype-figma` |
| `stub-figma-site-docs` | `Docs/Design system/README.md` | `<Figma link to the site file>` | `prototype-figma` |
| `stub-figma-library-docs` | `Docs/Design system/README.md` | `<Figma link to the library file>` | `prototype-figma` |
| `stub-commands` | `Code/README.md` | `<fill in>` | `stack-commands` |
| `stub-dev-port` | `Code/README.md` | `<dev port>` | `stack-commands` |
| `stub-quick-start` | `Code/README.md` | `<!-- Fill in: install dependencies` | `stack-commands` |
| `stub-gitignore` | `.gitignore` | `# Code/<dependency folder>/` | `stack-gitignore` |
| `stub-arch-tldr` | `Code/ARCHITECTURE.md` | `<!-- Stack in one line` | `stack-architecture` |
| `stub-arch-stack` | `Code/ARCHITECTURE.md` | `<!-- Framework, language` | `stack-choice` |
| `stub-arch-structure` | `Code/ARCHITECTURE.md` | `<!-- The folders under Code/` | `stack-architecture` |
| `stub-arch-styling` | `Code/ARCHITECTURE.md` | `<!-- How this stack scopes` | `stack-architecture` |
| `stub-arch-validation` | `Code/ARCHITECTURE.md` | `<!-- Which validator implements` | `ds-validator` |
| `stub-arch-dev-guard` | `Code/ARCHITECTURE.md` | `<!-- Where dev-only pages live` | `stack-dev-guard` |
| `stub-arch-catalog` | `Code/ARCHITECTURE.md` | `<!-- Filled in by /component-catalog` | `catalog-workbench` |
| `stub-arch-workflow` | `Code/ARCHITECTURE.md` | `<!-- Commands reference` | `stack-architecture` |
| `stub-arch-maintenance` | `Code/ARCHITECTURE.md` | `<!-- When to regenerate tokens` | `stack-architecture` |
| `stub-ci` | `.github/workflows/ci.yml` | `echo "TODO` | `stack-ci` |
| `stub-namespace-agents` | `Agents/context/design-system.md` | `Record the real namespace and its groups here` | `tokens-namespace` |
| `stub-namespace-map` | `Docs/Design system/token-usage.json` | `"namespace": "<prefix>"` | `tokens-namespace` |
| `stub-usage-map-example` | `Docs/Design system/token-usage.json` | `starting example for a Material-style system` | `tokens-usage-map` |
| `stub-registry-row` | `Docs/Design system/Guidelines/components.md` | `<Figma node link>` | `figma-registry` |
| `stub-registry-mapping` | `Docs/Design system/Guidelines/components.md` | `### <Name>` | `figma-registry` |
| `stub-catalog-roles` | `Code/README.md` | `<not turned on>` | `catalog-workbench` |
| `stub-env-figma-token` | `Code/.env.example` | `# FIGMA_ACCESS_TOKEN=` | `figma-connect-setup` |
| `stub-ds-summary` | `Docs/Design system/README.md` | `<!-- Summarize the system here` | `content-ds-summary` |
| `stub-supplemental` | `Docs/Design system/Supplemental/README.md` | `<!-- List supplemental sources here` | `content-supplemental` |
| `stub-guideline-overview` | `Docs/Design system/Guidelines/overview.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-color` | `Docs/Design system/Guidelines/color.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-typography` | `Docs/Design system/Guidelines/typography.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-layout` | `Docs/Design system/Guidelines/layout.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-elevation` | `Docs/Design system/Guidelines/elevation.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-shape` | `Docs/Design system/Guidelines/shape.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-motion` | `Docs/Design system/Guidelines/motion.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-accessibility` | `Docs/Design system/Guidelines/accessibility.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-content` | `Docs/Design system/Guidelines/content.md` | `- **Do** …` | `content-guidelines` |
| `stub-guideline-components` | `Docs/Design system/Guidelines/components.md` | `- **Do** …` | `content-guidelines` |
| `stub-persona-user` | `Docs/Personas/Users/EXAMPLE USER/EXAMPLE USER.md` | `Profile of user` | `content-personas` |
| `stub-persona-org` | `Docs/Personas/Orgs/EXAMPLE ORG/EXAMPLE ORG.md` | `Profile of organization` | `content-personas` |

## Changing this checklist

- **New item:** add a row with a new id, and its stub rows if it has placeholders.
  Prototypes pick it up as a new `todo` row the next time `/setup` runs.
- **Retired item:** delete the row. `/setup` flags the leftover status row so the prototype
  can drop it.
- **New tool:** its facts and links go in `Docs/Tooling.md`; the row here links to that
  entry.
