This folder is a place to export built versions of the prototype for manual transfer to a server or platform.

It also holds `DESIGN.md`, a portable summary of the design system for other AI tools (Lovable, Figma Make, Stitch, …), once `/export-design-md` has been run. Like everything here it is generated: edit `Docs/Design system/` and re-export instead of editing it.

`design-system/` holds the design system packaged for other prototyping platforms (Lovable, Replit, Bolt.new, v0, Figma Make, and DESIGN.md), one folder per platform with import steps. It is generated from the shipped code by the `design-system-export` skill and gitignored, so regenerate it rather than expecting it in a fresh clone.
