---
name: component-catalog
description: Turn on the component workbench (Storybook by default) and Figma Code Connect for the stack in Code/, then fill in stories and mappings from the component registry. Use when the user invokes /component-catalog, after a stack is chosen and the first components exist, when components were added without stories or mappings, or when a Figma library was recorded after components were built.
---

# /component-catalog

Turns the kit's stack-neutral component catalog into working tools for the stack in
`Code/`, then fills in whatever is missing. The contract it implements is
[`Agents/context/component-catalog.md`](../../context/component-catalog.md); read it first.

Safe to rerun. Each run only fills gaps: a workbench that is already set up is left alone,
a component that already has a story or mapping is skipped, and a piece whose inputs are
missing is skipped and reported, not treated as an error.

Commands are named by role; [`Code/README.md`](../../../Code/README.md) maps each to the
real command. Run them from `Code/`.

## Steps

### 1. Check the inputs

Work out which pieces can turn on, and tell the user before changing anything:

- **Stack:** `Code/` has a project (a package manifest or equivalent) and `Code/README.md`
  has real commands for `dev` and `build`. Without one, stop: there is nothing to turn
  on yet.
- **Components:** at least one component exists in `Code/`. Without one, stop.
- **Figma library:** a library link under "Figma sources" in
  [`Agents/context/design-system.md`](../../context/design-system.md#figma-sources). If it
  says `Figma: not used`, or still has its placeholder, skip step 5.

Work on a `chore/component-catalog` branch per
[`git-workflow.md`](../../context/git-workflow.md), unless this chat is already on a
branch for this work.

### 2. Reconcile the registry

In [`Docs/Design system/Guidelines/components.md`](../../../Docs/Design%20system/Guidelines/components.md):

- Add a row for each component in `Code/` that has none, with its code path. Fill in its
  code hooks in the property mappings from the component's `data-*` attributes.
- If a Figma library is recorded and the Figma tools are available, add the node link and
  Figma properties for library components that match a row. Never guess a link; leave the
  column empty when unsure.
- Remove the placeholder `<Name>` row once a real row exists.

### 3. Set up the workbench

Skip if the workbench is already set up (the `stories` role has a real command).

1. Run Storybook's installer from `Code/` (`npx storybook@latest init`, then pin the
   installed version). It detects the framework; if it can't, or the stack is one
   Storybook doesn't support, use the dev-only gallery page described under "Without
   Storybook" in the contract instead, and adapt the rest of this step.
2. Make the preview import the global stylesheet and the generated token CSS. If the
   tokens have modes (light and dark, for example), add a toolbar control that switches
   them the same way the prototype does (the same attribute or class).
3. Delete the example stories and assets the installer adds. They hardcode styles and
   would add deviations to the backlog.
4. Point the stories glob at the component folders (`<Component>.stories.*` next to each
   component).
5. Add the workbench's static output folder to `.gitignore` and to every linter's ignore
   list, next to the generated token CSS.
6. Make `stories-build` build the workbench and check every story renders (Storybook's
   test runner or its Vitest integration).
7. Optional, ask first:
   - Storybook's MCP add-on (`npx storybook add @storybook/addon-mcp`) lets agents query
     components and their stories. At the time of writing it supports React only and is
     in preview.
   - With a Figma library, `@storybook/addon-designs` embeds each component's Figma frame
     in its story.

### 4. Write the stories

For each registry row with a code path and no story:

- Create `<Component>.stories.*` next to the component, titled with the registry name.
- One control per variant axis in the property mapping, using the code values.
- A story per meaningful variant, or one story that shows every combination.
- Placeholder text and images in a story are sample content: keep it in the story file.

Fill in the row's Story column with the story id.

### 5. Set up Code Connect

Skip when no Figma library is recorded; mark the Code Connect column `n/a` when the
project says `Figma: not used`.

1. Add `@figma/code-connect` as a dev dependency, pinned.
2. Create `Code/figma.config.json`. Its `codeConnect.include` matches
   `<Component>.figma.*` files next to the components. Pick the parser by stack:

   | Stack | Code Connect setup |
   | --- | --- |
   | React, React Native | `react` parser |
   | Web Components, Angular, Vue, plain HTML | `html` parser |
   | SwiftUI | `swift` parser |
   | Jetpack Compose | `compose` parser |
   | Anything else (Svelte, Solid, …) | Template files (`.figma.js` or `.figma.ts`), with `label` and `language` set in the config so Figma highlights the snippet |

   Check the [Code Connect docs](https://developers.figma.com/docs/code-connect/) for the
   current options before writing the config.
3. For each registry row with a code path and a Figma node link, write
   `<Component>.figma.*` next to the component, mapping each Figma property to the code
   value the property mapping gives. Load the Figma Code Connect skill if one is
   available.
4. Make `connect` validate the files without publishing (`figma connect parse`, or
   `figma connect publish --dry-run`). Prefer a check that needs no token so CI can run
   it; if it needs `FIGMA_ACCESS_TOKEN`, add it as a CI secret and say so in
   `Code/ARCHITECTURE.md`. Pass `--exit-on-unreadable-files` in CI.
5. Make `connect --publish` publish (`figma connect publish`).
6. Uncomment `FIGMA_ACCESS_TOKEN` in `Code/.env.example`.
7. Never publish yourself. Tell the user to put a Figma personal access token in
   `Code/.env` and run `connect --publish`, and that publishing needs a Figma
   Organization or Enterprise plan.

Mark the Code Connect column `✓` for each component whose file passes `connect`.

### 6. Fill in the docs and CI

- `Code/README.md`: real commands for `stories`, `stories-build`, and `connect`.
- `Code/ARCHITECTURE.md`: the "Component catalog" section: workbench version and config
  location, how the preview loads tokens, the Code Connect parser and config location,
  and any stack-specific gotchas.
- `.github/workflows/ci.yml`: replace the `stories-build` and `connect` placeholders with
  the real commands. Delete the `connect` step if the project doesn't use Figma.

### 7. Verify

Run `lint`, `check`, `build`, `validate`, `stories-build`, and `connect` (when on). Then:

- The `build` output contains no stories and no workbench files.
- `stories` starts, and each new story renders with the prototype's tokens.
- `validate` added no deviations from story files.

Commit per [`git-workflow.md`](../../context/git-workflow.md) (type `chore` for the setup,
`feat` for stories and mappings added later) and push the branch. Report which pieces
turned on, which were skipped and why, and what the user still has to do (publishing).

## Notes

- Stories and mappings for components added later come from rerunning this skill, or
  from writing them by hand in the same change as the component.
- When a Figma library is recorded after the workbench is on, rerun: steps 2 and 5 are
  the only ones with work to do.
