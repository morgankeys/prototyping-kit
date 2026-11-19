---
name: editor-setup
description: Make the user's code editor show this kit's files properly. Looks at the repo, the stack in Code/, and the editor in use, then sets up what is missing so every file type gets syntax highlighting and lint problems show as underlines while editing. Asks when anything is unclear. From a session with no editor (a cloud session), explains what it is for and asks which editor and file types to set up. Use when the user invokes /editor-setup, after a stack is chosen, when files show as plain text or with the wrong colors, or when the user opens the kit in a new editor.
---

# /editor-setup

Makes the files in this kit look right in the user's editor: syntax highlighting for every
file type in `Code/`, and the project's linters shown as underlines while they edit, so a
problem is visible before `lint` or `validate` runs. It changes no code and adds no check:
what `lint` and `validate` decide stays the same with or without it.

Safe to rerun. A run with nothing to do says so (step 5).

**Read [`guiding-users.md`](../../context/guiding-users.md) before you start.** Many users
have never installed an editor extension. Name things the way their editor does, give one
step at a time, and do everything you can yourself.

Which extension or setting does what, per editor, is in "Editor" in
[`Docs/Tooling.md`](../../../Docs/Tooling.md#editor). This file holds the steps only.

## Steps

### 1. Find out what the repo needs

- **File types.** List the file extensions in `Code/` outside dependency and build
  folders (`.svelte`, `.vue`, `.astro`, `.tsx`, `.mdx`, `.css`, and so on). Read
  "Stack" in [`Code/ARCHITECTURE.md`](../../../Code/ARCHITECTURE.md) and the project
  manifest for the framework and for anything that changes how files read, such as
  Tailwind or CSS modules.
- **No stack yet.** If `Code/` has no project manifest, say that the editor setup depends
  on the stack, and offer [`/setup`](../setup/SKILL.md) to choose one first. The Markdown
  and JSON in `Docs/` and `Agents/` need nothing extra in any common editor.
- **Linters and formatter.** Note which of Stylelint, ESLint, and Prettier (or their
  replacements) are installed and configured in `Code/`, and where each config lives.
  Only those can be shown in the editor. Also note whether `validate` runs on Stylelint
  with a design-system config of its own (see
  ["Design-system validator"](../../../Docs/Tooling.md#design-system-validator), and
  "Validation" in `Code/ARCHITECTURE.md`).
- **What is already set up.** Read the editor's committed project files (for VS Code and
  Cursor: `.vscode/extensions.json` and `.vscode/settings.json` at the repo root).

### 2. Find out which editor

- **Hints, never proof.** Look at the environment and the repo: `TERM_PROGRAM=vscode`
  (VS Code and editors built on it, Cursor included), `TERMINAL_EMULATOR=JetBrains-JediTerm`
  (a JetBrains IDE), `ZED_TERM` (Zed), and project folders such as `.vscode/`, `.idea/`,
  or `.zed/`. A folder can be left over from someone else, so confirm with the user before
  you change anything based on it.
- **No editor here.** When `CLAUDE_CODE_REMOTE=true`, or nothing points to an editor, this
  session can't see one (a cloud session, for example). Explain the point of the skill in a
  sentence or two: their editor needs a small add-on for some file types, or those files
  show as plain text and errors don't show while they edit. Then ask which editor they use
  and, if the stack isn't chosen yet, which file types they expect to work with.
- **Still unclear,** or an editor not covered in `Docs/Tooling.md`: ask. Don't guess an
  editor, an extension, or a setting.

### 3. Compare and plan

For each file type, check what the editor already does, built in or through an extension
already recommended or installed. Then list the gaps:

- **Highlighting:** every file type in `Code/` gets proper colors and language support.
- **Lint underlines:** every linter the project has (Stylelint, ESLint, or their
  replacements) shows its problems in the editor, for every file type it checks in `lint`,
  using the same config `lint` uses. A linter that checks `.svelte` files in `lint` but
  only `.css` files in the editor is a gap.
- **Design-system hints:** if `validate` runs on Stylelint with its own design-system
  config, the editor's Stylelint extension can load that config instead, so it shows both
  CSS errors and design-system findings. Recommend it, and say what the second kind means:
  a hint to use a token, never an error to fix before carrying on (see
  ["Validation and linting"](../../../Docs/Design%20system/design-in-code%20architecture.md#validation-and-linting)).
  If the validator runs some other way, skip this.
- **Formatting:** the project's formatter is the editor's formatter for these file types.
  Ask before turning on format on save, because it rewrites files as they are saved.

If there are no gaps, go to step 5.

### 4. Set it up

- **Write the shared project files the editor reads** (for VS Code and Cursor,
  `.vscode/extensions.json` recommendations and `.vscode/settings.json`), so the setup
  travels with the repo. Only project settings go there: which extensions to recommend,
  which file types each linter checks and with which config, which formatter to use. Never personal ones such
  as a theme, a font, or a keyboard shortcut.
- **Confirm each extension id** on the marketplace the editor uses before you add it (see
  `Docs/Tooling.md`). Never add an id from memory.
- **Installing on the user's computer.** If this session runs on the user's computer and
  the editor has a command-line installer, offer to run it. Ask first: it changes their
  machine, not the repo. Otherwise give them the one step to take: open the kit's root
  folder in the editor and accept its offer to install the recommended extensions (or
  name the exact extensions to install). The root folder matters: an editor opened on
  `Code/` alone doesn't see settings at the repo root.
- **Commit** the project files with the rest of the change. In a cloud session, say they
  arrive when the user next pulls the branch.
- **Say what changed** in terms they can check: "`.svelte` files now show in color;
  invalid CSS shows a red underline." Then ask them to open one file of each type and say
  whether it looks right. For the underlines, offer to add a deliberate mistake to a
  scratch file so they can see one, then remove it.

### 5. Already set up

When nothing is missing, say so plainly, with the file types covered. Then ask whether
anything still looks wrong to them, or whether there is something else they want from
their editor. If something looks wrong, troubleshoot (below).

## Troubleshooting

Check these in order, and ask the user to check only what you can't see yourself:

1. **The kit's root folder is the one open in the editor**, not `Code/` or a single file.
2. **The extension is installed and enabled** for this workspace (editors can disable an
   extension per workspace).
3. **The file is recognized as the right language.** Most editors show the language in
   the status bar; if it says Plain Text, the language association is missing.
4. **The linter is told to check that file type** (for Stylelint in VS Code,
   `stylelint.validate` lists the language ids; by default only CSS and PostCSS).
5. **The linter finds its package and config.** They live in `Code/`, while the editor
   opens the repo root. Run an install in `Code/` if its dependencies are missing; some
   extensions also need to be told the working folder (see `Docs/Tooling.md`).
6. **The editor's built-in CSS checks disagree with Stylelint,** so the same line shows
   two different messages. Turn the built-in ones off in the project settings.
7. **The extension needs a restart** after its settings change. Ask the user to reload
   the editor window.

When a fix took real digging, record it in
[`Agents/context/troubleshooting/`](../../context/troubleshooting/README.md).
