# Guidelines

Written context capturing patterns and guidelines that tokens don't define. One topic per
file, so an agent loads only what its task needs. The topics follow the sections of
Google's [DESIGN.md](https://github.com/google-labs-code/design.md) format, split apart and
extended.

| File | Load when… |
| --- | --- |
| [`overview.md`](overview.md) | Any UI work beyond a small, local change: brand, personality, principles |
| [`color.md`](color.md) | Choosing or reviewing a color, state, or overlay |
| [`typography.md`](typography.md) | Setting or reviewing a text style |
| [`layout.md`](layout.md) | Spacing, grid, breakpoints, page structure |
| [`elevation.md`](elevation.md) | Shadows, surface tint, stacking, z-order |
| [`shape.md`](shape.md) | Corner radius and container shape |
| [`motion.md`](motion.md) | Any animation or transition |
| [`components.md`](components.md) | Before building UI, to reuse a component instead of recreating it |
| [`accessibility.md`](accessibility.md) | Interactive UI, forms, focus, media |
| [`content.md`](content.md) | Writing user-facing text |

## Conventions

- **Cite token names, never copy values.** Values live in `../Figma/Tokens/` (a Figma
  variables export, by default) and `../Supplemental/`; when a guideline and a token
  disagree on a value, the token wins.
  Guidelines say *when* and *why*.
- **Front matter** carries `title` and a one-line `description` of when to load the file,
  so an agent can pick files without opening them all.
- **Unfilled is fine.** Leave a stub's placeholders in place until there's a real answer;
  add gaps under *Open questions* rather than inventing a rule.
- **Portable export.** `/export-design-md` turns the filled-in parts of these files (all
  but `components.md`) into `Export/DESIGN.md`. Re-run it after editing them.
- **New topic:** copy [`_template.md`](_template.md) and add a row above.
- Docs that live elsewhere: link to them rather than copying, and note when they were last
  checked.
