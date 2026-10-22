# Component catalog

How the prototype's components are catalogued: the component registry, the component
workbench (Storybook by default), and Figma Code Connect. Read this before adding a
component, a story, or a Code Connect file, or before turning these tools on for a stack.

The kit installs none of the tools. The registry is plain docs and works from day one; the
workbench and Code Connect are turned on with `/component-catalog` once their inputs exist.

This file holds the rules, and is the only place they are stated. The steps for turning
the tools on are in
[`Agents/skills/component-catalog/SKILL.md`](../skills/component-catalog/SKILL.md); facts
about the tools themselves (gotchas, add-ons, setup by stack, plans) are in
[`Docs/Tooling.md`](../../Docs/Tooling.md#component-catalog). Other files link here
rather than restating a rule.

## Why

- **Reuse instead of recreating.** A story per component gives people and agents one place
  to see what exists and how each variant looks.
- **Designs come back as this project's components.** With Code Connect mappings
  published, the Figma tools return the project's own components when an agent implements
  a design, instead of generic markup.

## The pieces and what turns each on

| Piece | Needs | Turned on by |
| --- | --- | --- |
| Registry | Nothing | Already on: [`Docs/Design system/Guidelines/components.md`](../../Docs/Design%20system/Guidelines/components.md) |
| Workbench | A stack in `Code/` with at least one component | `/component-catalog` |
| Code Connect | A stack, at least one component, and a Figma library recorded in [`design-system.md`](design-system.md#figma-sources) | `/component-catalog` |

The pieces turn on independently and in any order. A missing input is not an error: skip
that piece, leave its registry column empty, and let a later run of `/component-catalog`
fill the gap. A Figma library that arrives after the components are built only needs its
links added to the registry and the skill run again.

## The registry

One table in `Docs/Design system/Guidelines/components.md`, plus one property mapping per
component with variants. It is the record the workbench and Code Connect are generated
from.

- **Rows come from evidence.** Add a row for a component that exists in the Figma library
  or in `Code/`, never for one you expect to need. In the template the table holds only
  its placeholder row.
- **Leave a column empty rather than guess.** Never invent a Figma node link, a code path,
  or a story id. A component in Figma but not in code, or the reverse, is a useful gap to
  see.
- **Property mappings are stack-neutral.** Each Figma variant property maps to the
  component's `data-*` variant attribute (see
  [`design-system.md`](design-system.md#component-variants)), so the mapping can be
  written from the Figma side before any code exists.
- **Status columns** use the values defined in the registry's own comment.

## Rules once the tools are on

- **One change, one component, everything with it.** A component added to `Code/` gets, in
  the same change: its registry row, a story, and a Code Connect file if its Figma column
  has a node link.
- **Stories sit next to their component** (`<Component>.stories.*`) and render it through
  its props and `data-*` attributes, one control per variant axis in the property
  mapping. They add no styles of their own; any wrapper styling follows the same token
  rules as components.
- **The workbench loads the real styles.** Its preview imports the global stylesheet and
  the generated token CSS, so a story looks like the prototype.
- **Story fixtures are sample content.** The [dev-only pages](dev-only-pages.md) rules
  apply: real pages never import a story or its fixtures.
- **The workbench never ships with the prototype.** Its static build is never written to
  `Export/` or deployed with `build`. A hosted workbench is public, so host one only when
  the owner asks.
- **Code Connect files sit next to their component** (`<Component>.figma.*`) and map
  Figma properties exactly as the registry's property mapping says.
- **Publishing is manual and local.** `connect` validates in CI; `connect --publish`
  runs only on the owner's machine, with `FIGMA_ACCESS_TOKEN` in `Code/.env`. Agents and
  CI never publish. Plan requirements are in `Docs/Tooling.md`.

## Without Storybook

The workbench is a role; Storybook is its default. A stack where Storybook doesn't fit can
use a single gallery page under the [`dev/` pages folder](dev-only-pages.md) instead: one
section per registry component, every variant shown. Record the choice in
`Code/ARCHITECTURE.md` and point `stories` at the dev server route. The rules above still
apply.

## Not using Figma?

Write `Figma: not used` under "Figma sources" in
[`design-system.md`](design-system.md#figma-sources). Agents and `/component-catalog` then
skip Code Connect for good and mark its registry column `n/a`. That is enough on its own.

To also remove the Code Connect placeholders, delete:

| Place | What to remove |
| --- | --- |
| `Docs/Tooling.md` | The "Figma Code Connect" entry |
| `README.md` | The *Figma* publishing step in "Getting started" |
| `Code/README.md` | The `connect` row |
| `Code/ARCHITECTURE.md` | The Code Connect comment under "Component catalog" |
| `.github/workflows/ci.yml` | The `connect` step |
| `.github/pull_request_template.md` | `connect` in the component catalog checkbox |
| `Code/.env.example` | The `FIGMA_ACCESS_TOKEN` block |
| `Docs/Design system/Guidelines/components.md` | The Figma and Code Connect columns, and the Figma columns of the property mappings |
| `Agents/skills/component-catalog/SKILL.md` | The "Set up Code Connect" step, and its mentions in the other steps |

The token pipeline's Figma default is separate; see
[`Agents/skills/design-tokens/SKILL.md`](../skills/design-tokens/SKILL.md).
