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

What the kit needs is a source of truth for tokens. The default is Figma:

**Figma → tokens → prototype → capture back to Figma**.

Alternatively, a team can use this kit, or in a separate repository, as the source of truth 
and feed both the prototype and Figma.

Teams can also use tools other than Figma as long as tokens can be stored/exported to this kit.

## Folders

| Folder    | Purpose                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `Code/`   | The entire codebase for the prototype being built.                        |
| `Docs/`   | Human-level documentation and resources.                                  |
| `Export/` | Built versions of the prototype, staged for manual transfer to a server.  |
| `Agents/` | Instructions, skills, context, and prompts for AI agents.                 |

<!-- template-only:start -->
## Start a new kit

```bash
./new-kit.sh
```

The script asks for the new kit's name and where to put it, copies the template's
committed files into a fresh git repo, and can create and push a GitHub repo for it.

The new kit is standalone: it does not include `new-kit.sh` or any `template-only`
sections of the docs, like this one. Its README gets the kit's name and a
[provenance line](Agents/context/kit-structure.md#kit-provenance), and the repo gets a
`template` git remote pointing back here so you can pull in later kit updates
(`git fetch template`, then merge).

<!-- template-only:end -->
## Getting started

Setting up a new kit, in order. Steps marked *Figma* are skipped by teams that don't use
it.

1. **Check provenance.** Make sure the kit records where it came from (see
   [`Agents/context/kit-structure.md`](Agents/context/kit-structure.md#kit-provenance)).
   Kits made with the template's `new-kit.sh` already do.
2. **Record the design sources.** Add the Figma site and library links to
   [`Agents/context/design-system.md`](Agents/context/design-system.md#figma-sources) and
   [`Docs/Design system/README.md`](Docs/Design%20system/README.md), or write
   `Figma: not used` in both.
3. ***Figma:* fill the component registry.** Ask an agent to list the library's components
   into
   [`Docs/Design system/Guidelines/components.md`](Docs/Design%20system/Guidelines/components.md),
   with node links and variant properties. List only components the library has.
4. **Pick a stack** for `Code/`, and fill in the command table in
   [`Code/README.md`](Code/README.md) and the skeleton in
   [`Code/ARCHITECTURE.md`](Code/ARCHITECTURE.md).
5. **Bring in tokens.** Put the token export in `Docs/Design system/Figma/Tokens/` and
   follow [`Agents/skills/design-tokens/SKILL.md`](Agents/skills/design-tokens/SKILL.md).
6. **Build components.** Each new component gets its registry row in the same change.
7. **Run `/component-catalog`.** It sets up Storybook, writes a story per registry row,
   and, if a Figma library is recorded, sets up Code Connect. See
   [`Agents/context/component-catalog.md`](Agents/context/component-catalog.md).
8. ***Figma:* publish the Code Connect mappings.** Put a Figma personal access token in
   `Code/.env` as `FIGMA_ACCESS_TOKEN` and run `connect --publish` from `Code/`. Needs a
   Figma Organization or Enterprise plan.

After setup:

- New components: add the registry row, then rerun `/component-catalog` (or write the
  story and mapping in the same change).
- A Figma library arrives late: add its links to the registry and rerun
  `/component-catalog` to turn on Code Connect.
- Browse [`Docs/Tooling.md`](Docs/Tooling.md) for other tools worth adding.
- Managing branches and repo settings: [`Docs/github.md`](Docs/github.md).
