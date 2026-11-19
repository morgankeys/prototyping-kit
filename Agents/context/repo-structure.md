# Repo structure

Background on how this repo is organized. Load this before making changes that span
folders.

## Template and prototype

Two words, used the same way everywhere in this repo:

- **Template:** the master copy, `prototyping-kit`, not set up for any project. It has
  `new-prototype.sh`, which makes new prototypes from it. Setup never happens in it.
- **Prototype:** a repo made from the template for one project, and set up for it with
  `/setup`. It has no `new-prototype.sh`.

Most files here are the same in both. Where a sentence applies to whichever one you are
in, it says "this repo".

## Top-level folders

- `Code/` — the full codebase for the current prototype.
- `Docs/` — human-level documentation and resources.
- `Export/` — a drop zone for built versions of the prototype, staged for manual transfer
  to a server or environment. Treat as output: write here, don't hand-edit.
- `Agents/` — agent-facing instructions, skills, context, and prompts (this folder lives
  under `Agents/context/`).

## Design decisions

- **Agent content lives at the repo root, not inside `Code/`.** It applies to whatever is
  being built in `Code/`. It is intentionally *visible* (not a dotfolder)
  because both humans and agents curate it.
- **Tool-mandated files stay in their required locations.** The repo-root `AGENTS.md` is
  the front door; `.cursor/rules/` holds Cursor rule stubs that point back into `Agents/`
  rather than duplicating content. `.claude/skills/<skill>/SKILL.md` and
  `.cursor/skills/<skill>/SKILL.md` hold the same kind of stub for skills, because Claude
  Code and Cursor only discover skills there (e.g. `.claude/skills/pr/SKILL.md` points to
  `Agents/skills/pr/SKILL.md`). `CLAUDE.md`, `GEMINI.md`, and
  `.github/copilot-instructions.md` point to `AGENTS.md`.
- **Single source of truth.** When guidance could live in two places, put it in `Agents/`
  and reference it from the tool-mandated file. Within this repo, each kind of material has
  one home: rules in `Agents/context/`, procedures in `Agents/skills/` (which link to the
  rules rather than restating them), and facts about third-party tools in
  `Docs/Tooling.md`. Entry points (`README.md`, guideline files, `.cursor/rules/`) keep at
  most a one-line reminder plus a link.

- **Setup progress is per prototype.** What a prototype needs is defined once, in
  `Agents/skills/setup/checklist.md`. Each prototype's progress is in
  `Docs/setup-status.md`, written by `/setup`. The template never has that file.

## Provenance

A prototype records which version of the template it was created from. One line in its
root `README.md`:

> Created from prototyping-kit @ `<sha>` on `<date>`.

Prototypes made with the template's `new-prototype.sh` get this line automatically, plus a
`template` git remote pointing back at the template. A prototype copied by hand (including
one made with GitHub's "Use this template" button) gets the line from `/setup`. Older
prototypes may say `Forked from` instead; both are read the same way. `prototyping-kit` in
the line is the template's repository name.

The line is a record only. A prototype starts with its own git history, so there is no supported
way yet to bring later template changes into it: don't merge from the `template` remote.
Until an update process exists, compare the two by hand and copy across what is wanted.
<!-- template-only:start -->

In the template itself, `new-prototype.sh` is the way to start a new prototype. It strips
itself, the template's own CI (`.github/workflows/template.yml` and
`.github/template-checks/`, which check the template itself and test the reference
validator), and every `template-only` block (like this one) from the copy, so a prototype
never contains them. That CI also fails if setup starts in the template instead of a
prototype.
<!-- template-only:end -->
