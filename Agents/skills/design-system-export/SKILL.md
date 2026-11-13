---
name: design-system-export
description: Export this kit's design system (tokens, components, usage rules) into the formats other AI prototyping platforms ingest — DESIGN.md, Lovable, Replit, Bolt.new, v0, and Figma Make. Use when asked to export, package, or share the design system, to try it in another tool, to set up Code/design-export/ for a new kit, or to add an export target.
---

# Design-system export

Turns the design system the prototype in `Code/` actually ships into ready-to-import
packages for other prototyping platforms. One command, one output folder per platform,
each with a README listing the exact import steps.

The engine in `scripts/` is the same in every kit. What makes it specific to one system is
`Code/design-export/`: a config and React ports of the shipped components. In the template
that folder is a stub; a kit fills it in once its stack and tokens exist (see
[Setting up a kit](#setting-up-a-kit)).

## Run it

From the repo root (Node 22 or newer):

```bash
node Agents/skills/design-system-export/scripts/export.mjs
```

```bash
node Agents/skills/design-system-export/scripts/export.mjs lovable v0   # only some targets
```

```bash
node Agents/skills/design-system-export/scripts/export.mjs --list       # show targets
```

Run the `tokens` role first if the token CSS is missing (it is usually gitignored). Output
goes to `Export/design-system/<target>/`, which is gitignored: regenerate it, never edit it.
Other flags: `--out <dir>`, `--config <file>`, `--no-archives`. A kit can add a package
script for this; record it as the `ds-export` role in `Code/README.md`.

## Targets

| Target | What it produces | How the platform takes it |
| --- | --- | --- |
| `design-md` | `DESIGN.md` in Google's format | Attach or paste in AI Studio; import in Stitch; commit at a repo root |
| `lovable` | A Vite + React + Tailwind design-system project (zip) with `.lovable/` knowledge, plus a 10,000-character Instructions fallback | Upload into a Lovable design-system project and release |
| `replit` | An Agent skill (`.agents/skills/…`) carrying the source, a `replit.md` block, custom instructions, and a `DESIGN.md` seed | Copy into a Repl, add as a workspace skill, or seed Replit Design |
| `bolt` | npm tarball, source zip, agent instructions, single-project prompt | Team design-system import (NPM + Files sources) |
| `v0` | Source zip with a shadcn registry, npm tarball, import notes | Design Systems import at v0.app/design-systems |
| `figma-make` | A built, publishable npm package and a `guidelines/` folder | Publish the package, add it and the guidelines to a Make kit |

How each platform ingests a design system, with sources, is in
[`platforms.md`](platforms.md). Re-read the platform's docs before changing a target:
these products change quickly.

**This skill or `/export-design-md`?** `/export-design-md` writes a portable
`Export/DESIGN.md` from `Docs/Design system/` and works before any code exists. This skill
works from the code the prototype ships, so its output (including its own DESIGN.md) carries
the real token values for every mode, plus components, and covers the other platforms.
Once `Code/design-export/` is set up, prefer this one.

## How it is put together

```
Agents/skills/design-system-export/
  scripts/            the engine — identical in every kit
    export.mjs        CLI
    model.mjs         reads the kit's token CSS into one normalized model
    builders/         css.mjs · docs.mjs · react.mjs — shared output pieces
    targets/          one module per platform
  examples/react/     worked React ports (from a Vue + Astro kit)
  platforms.md        research notes per platform
Code/design-export/   this kit's adapter
  config.mjs          token sources, modes, role meanings, mappings, components, guidance
  react/*.tsx         React ports of the shipped components
```

- **The model is built from the generated token CSS**, not the token export. The CSS is
  what the prototype ships, so an export cannot drift from it, and alpha, units, and
  responsive modes are already resolved. Any system of CSS custom properties works.
- **Component styles are not ported.** The exporter lifts each component's style block out
  of its source file. Only markup is ported, in `Code/design-export/react/`, and a port must
  match the original's class names and `data-*` attributes exactly.
- **Everything system-specific is in `config.mjs`**: what each color and type role is for,
  the shadcn/ui and Tailwind mappings, DESIGN.md component specs, and the prose. The engine
  has no opinions about any particular system.

## Setting up a kit

Do this once the stack is chosen and the `tokens` role produces CSS.

1. **Sources and modes.** In `Code/design-export/config.mjs`, point `sources.tokens` at the
   generated token CSS and `sources.base` at the global stylesheet. Copy each color mode's
   selector and each responsive `@media` condition exactly as the token CSS writes them.
2. **Prefixes.** Set each `tokens.*.prefix` to the project's namespace
   (`--<prefix>-*` in `Agents/context/design-system.md`).
3. **Fonts.** One entry per family, with the custom property that holds it.
4. **Mappings.** Point every `shadcn.colors` entry and `tailwind.radius` step at a role or
   shape key that exists. The export fails on an unknown key and names it.
5. **Guidance.** Distil `guidance` from `Docs/Design system/Guidelines/`: overview,
   principles, a usage line per color and type role, layout, shape, elevation, do's and
   don'ts, and recipes for common elements the library does not ship. Agents on other
   platforms only know what is written here, so be specific and name tokens.
6. **Components.** For each component worth shipping, add a React port in
   `Code/design-export/react/` (see `examples/react/`) and a `components` entry with props,
   usage, a `showcase` snippet, and notes. The npm package targets compile the ports with
   TypeScript, which must be installed in `Code/`.
7. **Run and verify** (below). Fix anything the style-guide page shows wrong.

## When the design system changes

| Change | What to do |
| --- | --- |
| Token values, new tokens | Run `tokens`, then the export. New roles appear automatically; add a usage line in `guidance.colorRoles` / `guidance.typeRoles` |
| A shipped component's styles | Re-export. Nothing else |
| A shipped component's template or props | Update its port in `react/` and its `props` in `config.mjs` to match |
| A new component worth shipping | Add `react/<Name>.tsx` and a `components` entry |
| Guidance | Edit `guidance`. The Lovable and Bolt condensed prompts must stay under 10,000 characters; the export fails if they do not |

Bump `version` in `config.mjs` before publishing the npm package again.

## Verify an export

The export only fails on structural problems (missing sources, unknown token references,
TypeScript errors in a port, oversized prompts). After a meaningful change, also:

1. Build the generated project and look at it in both themes:
   ```bash
   cp -R Export/design-system/lovable/project /tmp/ds && cd /tmp/ds && npm install && npm run dev
   ```
   Its page is a living style guide. Compare it with the prototype.
2. Lint the DESIGN.md with Google's CLI, at the version `/export-design-md` pins:
   `npx @google/design.md@0.4.0 lint Export/design-system/design-md/DESIGN.md`.

## Adding a platform

1. Read the platform's current docs and add a section to `platforms.md`.
2. Add `scripts/targets/<id>.mjs` exporting `{ id, title, summary, build(model) }`.
   `build` returns `{ files, archives?, next? }`: `files` is a path → content map, so a
   target never touches the disk. Compose it from the builders; add to a builder rather
   than formatting tokens inside a target. Never read kit values directly: anything
   system-specific belongs in the config.
3. Register it in `scripts/targets/index.mjs` and add a row to the table above.
4. Write the target's README from the user's side: what each file is, then numbered steps
   using the platform's own UI labels.

Engine improvements made in a kit belong back in the template (and the reverse); see
`Agents/context/kit-structure.md` for porting between kit and fork.
