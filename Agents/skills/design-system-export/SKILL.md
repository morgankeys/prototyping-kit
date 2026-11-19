---
name: design-system-export
description: >-
  Export this repo's design system from Docs/Design system into packages for
  Lovable, Replit, Bolt.new, v0, and Figma Make. Use when asked to export or
  share the design system, or to package components from Code for those platforms.
---

# Design-system export

The design system lives in `Docs/Design system/`. This skill publishes it for other
prototyping platforms. `Code/` is not the source of tokens or guidelines. It is checked
only for component implementations the inventory already lists.

Two pieces:

- **Script** — deterministic. Reads Docs, writes `Export/design-system/<target>/`. An npm
  command runs it with no agent in the loop. It is the only writer of that folder.
- **This skill** — the front door. It always runs the script. When the inventory points
  at a component that exists in `Code/`, it ports the markup and runs the script again
  so those components are attached.

`/export-design-md` remains the only writer of `Export/DESIGN.md`. Both skills read Docs
through `Agents/skills/export-design-md/scripts/read-docs.mjs`.

Platform intake and import steps: `Agents/context/design-system-platforms.md` and
`Agents/context/design-system-platform-packages.md`.

## Run the Docs export

From the repo root (Node 22 or newer):

```bash
npm run ds-export
```

```bash
node Agents/skills/design-system-export/scripts/export.mjs lovable v0
```

```bash
node Agents/skills/design-system-export/scripts/export.mjs --list
```

Exit code 3 means every guideline is still a stub and there are no tokens. Stop and name
the files to fill in. Do not invent a sample system.

The script writes token CSS from the token JSON. Opaque colors stay hex. A Figma color
with `alpha` below 1 is emitted as `rgb(r g b / a)`, because `hex` is RGB only. Modes
found in the token JSON use `:root` for the default mode and
`:root[data-mode="<id>"]` for the others. The id is the mode's name, not a selector
copied from `Code/`.

shadcn and Tailwind name mappings are not guessed. Exports speak in the system's own
token names.

Output is generated and gitignored. Do not hand-edit it.

## Port components, when they exist

Skip this whole section when the inventory has nothing to port. The Docs export is
complete without it.

```bash
node Agents/skills/design-system-export/scripts/inventory.mjs
```

That prints each real inventory row. Placeholder rows are omitted.

- **present** — the `Code` path exists. You may port it.
- **missing** or **no code path** — skip it.
- A file in `Code/` that is not in the inventory — leave it out.

For each present row:

1. Read the source. List the contract:

   ```bash
   node Agents/skills/design-system-export/scripts/port-report.mjs Code/path/from/the/inventory
   ```

2. Write a React port at `Agents/skills/design-system-export/components/<Name>.tsx`.
   Match the source class names and `data-*` attributes exactly. Use a default export.
   Put lifted styles in a sibling `.css` file if the source has a style block, and import
   it from the port. Do not restyle. Do not rename tokens. Do not add colors, sizes, or
   radii as raw values. Do not use inline styles.

3. Add the row to `Agents/skills/design-system-export/components/manifest.json`:

   ```json
   {
     "components": [
       {
         "name": "Button",
         "source": "Code/path/from/the/inventory",
         "file": "Button.tsx",
         "css": "Button.css",
         "summary": "One line from the inventory notes."
       }
     ]
   }
   ```

   `source` must match the inventory's Code cell. `css` is optional.

4. Run the export again. The script checks each port: the name is in the inventory, the
   source exists, class names and data attributes match, there is a default export, and
   the port has no inline style or hardcoded color. A port that fails is skipped and
   named. The Docs package is still written. Fix the port and run again.

Commit the manifest and the ports with the export change so a later `npm run ds-export`
can package them without porting again. Re-port when the source markup or its props change.
A styles-only change in `Code/` is picked up on the next port; the script does not read
component source on its own.

When a manifest validates, Lovable gains a project zip, Replit gains component source
under the skill's `assets/`, and Bolt, v0, and Figma Make gain a source package. v0's
registry lists those components and does not invent a shadcn theme.

## Verify

On a prototype that has tokens or filled guidelines, run the export and read the warnings.
`Export/design-system/design-md/README.md` points at `Export/DESIGN.md`; it does not
contain a second copy. Lovable's `instructions.md` and Bolt's `project-prompt.md` must
stay at or under 10,000 characters. The script exits 1 when they do not.

```bash
node Agents/skills/design-system-export/scripts/export.mjs --self-test
```

That runs against a temporary prototype, not this repo's Docs.
