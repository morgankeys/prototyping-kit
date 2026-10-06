# Prototyping kit

A starting point for designers who prototype with AI agents. Fork it, point it at a Figma
file, and build the prototype in `Code/` with whatever stack suits the project.

## The idea

- **`Code/` is disposable.** The prototype can be wiped and rebuilt without disturbing the
  design sources or the agent context around it. The kit assumes no front-end stack;
  `Code/README.md` maps the kit's command roles (`dev`, `build`, `lint`, …) to the
  project's real commands.
- **`Agents/` evolves.** Skills, context, and prompts accumulate as you and your agents
  learn what works. Every AI tool reads the same material, starting at
  [`AGENTS.md`](AGENTS.md).
- **`Docs/` is the source of truth** for design and content: personas, assets, and the
  design system, including the Figma token exports the prototype is built from.

The one assumed dependency is Figma. The spine of the kit is
**Figma → tokens → prototype → capture back to Figma**.

## Folders

| Folder    | Purpose                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `Code/`   | The entire codebase for the prototype being built.                        |
| `Docs/`   | Human-level documentation and resources.                                  |
| `Export/` | Built versions of the prototype, staged for manual transfer to a server.  |
| `Agents/` | Instructions, skills, context, and prompts for AI agents.                 |

## Getting started

1. Fork the repo and record where it came from (see
   [`Agents/context/kit-structure.md`](Agents/context/kit-structure.md#kit-provenance)).
2. Pick a stack for `Code/` and fill in the command table in
   [`Code/README.md`](Code/README.md) and the skeleton in
   [`Code/ARCHITECTURE.md`](Code/ARCHITECTURE.md).
3. Export your Figma variables into `Docs/Design system/Figma tokens/` and follow
   [`Agents/skills/design-tokens/SKILL.md`](Agents/skills/design-tokens/SKILL.md).
4. Browse [`Docs/Tooling.md`](Docs/Tooling.md) for tools worth adding.
5. Managing branches and repo settings: [`Docs/github.md`](Docs/github.md).
