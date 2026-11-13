---
name: component-catalog
description: Turn on the component workbench (Storybook by default) and Figma Code Connect for the stack in Code/, then fill in stories and mappings from the component registry. Use when the user invokes /component-catalog, after a stack is chosen and the first components exist, when components were added without stories or mappings, or when a Figma library was recorded after components were built.
---

# /component-catalog

Turns the kit's stack-neutral component catalog into working tools for the stack in
`Code/`, then fills in whatever is missing.

This file holds the steps only. Read these first and follow them throughout:

- **Rules:** [`Agents/context/component-catalog.md`](../../context/component-catalog.md),
  the contract every story, mapping, and registry entry must meet.
- **Tool facts:** the Storybook and Figma Code Connect entries in
  [`Docs/Tooling.md`](../../../Docs/Tooling.md#component-catalog): installer gotchas,
  add-ons, Code Connect setup by stack, commands, and plan requirements.

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
  says `Figma: not used`, or still has its placeholder, skip the Code Connect step.

Work on a `chore/component-catalog` branch per
[`git-workflow.md`](../../context/git-workflow.md), unless this chat is already on a
branch for this work.

### 2. Reconcile the registry

In [`Docs/Design system/Guidelines/components.md`](../../../Docs/Design%20system/Guidelines/components.md),
following the contract's registry rules:

- Add a row for each component in `Code/` that has none, with its code path. Fill in its
  code attributes in the property mappings from the component's `data-*` attributes.
- If a Figma library is recorded and the Figma tools are available, add the node link and
  Figma properties for library components that match a row.
- Remove the placeholder `<Name>` row once a real row exists.

### 3. Set up the workbench

Skip if the workbench is already set up (the `stories` role has a real command).

1. Run Storybook's installer from `Code/` (`npx storybook@latest init`), then pin the
   installed version. If it can't detect the framework, or Storybook doesn't support the
   stack, follow "Without Storybook" in the contract instead and adapt the rest of this
   step.
2. Configure the preview as the contract's workbench rules require. If the tokens have
   modes (light and dark, for example), add a toolbar control that switches them the same
   way the prototype does (the same attribute or class).
3. Delete the example stories and assets the installer adds.
4. Point the stories glob at the component folders.
5. Add the workbench's static output folder to `.gitignore` and to every linter's ignore
   list, next to the generated token CSS.
6. Make `stories-build` build the workbench and check every story renders (Storybook's
   test runner or its Vitest integration).
7. Optional, ask first: the add-ons listed under Storybook in `Docs/Tooling.md`.

### 4. Write the stories

For each registry row with a code path and no story, write its story as the contract's
story rules describe, titled with the registry name: a story per meaningful variant, or
one story that shows every combination. Fill in the row's Story column with the story id.

### 5. Set up Code Connect

Skip when no Figma library is recorded; mark the Code Connect column `n/a` when the
project says `Figma: not used`.

1. Add `@figma/code-connect` as a dev dependency, pinned.
2. Create `Code/figma.config.json`, using the setup for this stack from the Code Connect
   entry in `Docs/Tooling.md`. Its `codeConnect.include` matches the Code Connect files
   next to the components. Check the
   [Code Connect docs](https://developers.figma.com/docs/code-connect/) for the current
   options before writing it.
3. For each registry row with a code path and a Figma node link, write its Code Connect
   file as the contract's rules describe. Load the Figma Code Connect skill if one is
   available.
4. Point `connect` and `connect --publish` at the validate and publish commands in
   `Docs/Tooling.md`. Prefer a validation that needs no token, so CI can run it; if it
   needs `FIGMA_ACCESS_TOKEN`, add it as a CI secret and say so in `Code/ARCHITECTURE.md`.
5. Uncomment `FIGMA_ACCESS_TOKEN` in `Code/.env.example`.
6. Don't publish. Tell the user to put a Figma personal access token in `Code/.env`, run
   `connect --publish`, and check the plan requirement in `Docs/Tooling.md` first.

Mark the Code Connect column `✓` for each component whose file passes `connect`.

### 6. Fill in the docs and CI

- `Code/README.md`: real commands for `stories`, `stories-build`, and `connect`.
- `Code/ARCHITECTURE.md`: the "Component catalog" section, as its comment asks.
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
- When a Figma library is recorded after the workbench is on, rerun: the registry and
  Code Connect steps are the only ones with work to do.
