# Prototyping kit

A starting point for designers who prototype with AI agents. Start a kit, ask your agent to
run `/setup`, point it at a Figma file, and build the prototype in `Code/` with whatever
stack suits the project.

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

Alternatively, a team can keep tokens in this kit, or in a separate repository, as the
source of truth and feed both the prototype and Figma.

Teams can also use tools other than Figma, as long as the tokens are stored in this kit.

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
[provenance line](Agents/context/kit-structure.md#kit-provenance) recording which version
of the template it came from. Then open the new kit and run `/setup`.

Bringing later template changes into an existing kit is not supported yet.

<!-- template-only:end -->
## Getting started

Ask your agent to run **`/setup`**. It looks at what the kit already has, tells you what
it needs from you, does the technical work itself, and walks you through the rest one
step at a time. You don't need to have set up a codebase before.

### What to bring

- **Your design files.** Links to the Figma file with your core styles and components
  (the library) and the one with the screens you want to build. Not using Figma is fine;
  say so and the Figma steps are skipped.
- **Your design tokens.** The colors, type, and spacing from your library, exported from
  Figma. `/setup` shows you how.
- **An idea of what you're building**, and who will see it. The agent uses this to
  recommend how to build it.
- **Access to your accounts.** You sign in to Figma when the agent connects to it, and
  the kit lives in a GitHub repository.
- **Content, when you have it.** Example users and organizations, images, and any written
  design guidelines. These can come later.

### The broad strokes

1. **Point the kit at your design sources.**
2. **Choose how the prototype is built.** The agent recommends a setup and installs it.
3. **Bring in your tokens**, so the prototype matches your design file.
4. **Add the guardrails**: checks that keep the code on your design system.
5. **Connect the Figma tools**, so the agent can read your designs and send pages back.
6. **Build components and catalog them**, so each one is built once and reused.

Most of the tools are optional; tell the agent to skip any you don't want. Rerun `/setup`
whenever you like to see what is still open. Progress is kept in `Docs/setup-status.md`,
and the full list of what a kit needs is the
[setup checklist](Agents/skills/setup/checklist.md).

After setup:

- New components: ask the agent to add them, then rerun `/component-catalog`.
- Other tools worth adding: [`Docs/Tooling.md`](Docs/Tooling.md).
- Managing branches and repo settings: [`Docs/github.md`](Docs/github.md).
