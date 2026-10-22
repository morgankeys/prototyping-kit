---
title: Components
description: Which components exist and where their code and Figma sources live. Load before building any UI so you reuse a component instead of recreating it.
---

# Components

## Inventory

<!-- The component registry. Empty until the project has components: one row per component
that exists in the Figma library or in Code/, never one you expect to need. Remove the
placeholder row once a real row exists. If a component isn't listed, check Code/ before
building one.

Story and Code Connect: empty = not yet, ✓ = done and passing its check, n/a = will never
apply. Contract: Agents/context/component-catalog.md -->

| Component | Figma | Code | Story | Code Connect | Notes |
| --- | --- | --- | --- | --- | --- |
| <Name> | `<Figma node link>` | `Code/<path>` | `<story id>` | | Variants, when to use, known gaps |

## Property mappings

<!-- One block per component with variants, named as in the inventory. The Figma columns
can be filled from the library before any code exists; the code columns when the component
is built. Stories and Code Connect files are generated from these. Delete the Figma columns
if the project doesn't use Figma. -->

### <Name>

| Figma property | Figma values | Code attribute | Code values |
| --- | --- | --- | --- |
| `<Size>` | `<Small>`, `<Medium>` | `data-size` | `<sm>`, `<md>` |

## Rules

- Reuse a listed component before building a new one; extend it with a variant before forking it.
- A new component gets a row here in the same change that adds it to `Code/`, plus its
  property mapping if it has variants.
- Leave a column empty rather than guess. Never invent a Figma link or a code path.
- Stories and Code Connect files follow
  [`Agents/context/component-catalog.md`](../../../Agents/context/component-catalog.md);
  `/component-catalog` turns them on and fills gaps.

## Do / Don't

<!-- Pair each with a one-line reason. Add a screenshot or Figma link if it helps. -->

- **Do** …
- **Don't** …

## Open questions

<!-- Gaps where the system has no answer yet. Agents: add a line here instead of guessing. -->
