# What each platform export should produce

Companion to [`design-system-platforms.md`](design-system-platforms.md). Output belongs in
`Export/design-system/` and is generated, never hand-edited.

`npm run ds-export` writes the document and token files from `Docs/Design system/` every
time. A zip, tarball, or component source file is added only when
`Agents/skills/design-system-export/components/manifest.json` validates. The script does
not read `Code/` to find components; the skill writes the manifest.

Several targets share one guideline folder. `Guidelines.md` is the entry point and routes
to short files:

| Path | Contents |
| --- | --- |
| `setup.md` | How to import styles, and Tailwind utilities when the platform uses them |
| `foundations/color.md` | Color roles and when to use them |
| `foundations/typography.md` | Type roles |
| `foundations/layout.md` | Spacing, page width, breakpoints |
| `foundations/shape-and-elevation.md` | Radius and elevation |
| `components/<name>.md` | One file per component, once components are specified |
| `composition/recipes.md` | How to build elements the library does not ship |

Lovable's condensed instructions and Bolt's single-project prompt must stay under 10,000
characters.

## DESIGN.md

`/export-design-md` writes `Export/DESIGN.md` from Docs. The platform export's `design-md`
target is a README that points at that file. It does not write another one.

- AI Studio: attach `DESIGN.md` to the prompt in Build mode, or paste it into System
  instructions, and ask it to follow the file.
- Stitch: import `DESIGN.md` as the project's design system.
- Any repo-reading agent: commit `DESIGN.md` at the repository root.
- Validate with the version `/export-design-md` pins:
  `npx @google/design.md@0.4.0 lint DESIGN.md`.

## Lovable

The script always writes `instructions.md` and `guidelines/`. The project zip is added only when a component manifest validates.

| Path | What it is |
| --- | --- |
| `<slug>-lovable-design-system.zip` | A Vite + React + Tailwind v4 project, zipped for upload |
| `project/` | The same project, unzipped |
| `instructions.md` | Condensed tokens and rules for the Instructions field |
| `guidelines/` | The full guidelines as separate files |

Inside the project: tokens in `src/styles/tokens.css`, a barrel at `src/index.ts`,
components in `src/components/`, knowledge in `.lovable/system.md` and
`.lovable/rules/` (`design-tokens.md`, `components.md`, `library-guidelines.md`). A
top-level `AGENTS.md` restates where those live. `src/App.tsx` is a style-guide page,
not part of the library. `.lovable/system.md` is never overwritten by Lovable;
`.lovable/rules/` may be regenerated on release.

**A Lovable design system (paid plans)**

1. On lovable.dev, click **+** on the prompt box, then **Design** → **Use a design system** → **Create design system**.
2. In the new project's chat, upload the zip and tell Lovable to keep `src/` and `.lovable/` as the library source: components, the barrel, `src/styles/tokens.css`, and the knowledge files.
3. Check the preview against the style-guide page.
4. Click **Release version**. Only a released design system can be attached.
5. Attach it from **+** → **Project** → **Design system**, or start a project from **+** → **Design** → **Use a design system**.

A public Git URL can replace the upload. Lovable cannot fetch a private repository.
One design system per project. A consumer scaffolded on Tailwind 3 can conflict with a
Tailwind v4 library; Lovable's setup check usually resolves it.

**Instructions (all plans)**

1. Open **Project settings** → **Instructions** (or **Workspace settings** → **Instructions**).
2. Paste `instructions.md`.

This carries tokens and rules. Lovable rebuilds components from the recipes. The same
text can live in a top-level `AGENTS.md`, which Lovable reads on every message.

## Replit

The script always writes the skill prose, token CSS, and `tokens.json`. Component source under `assets/components/` is added only when a component manifest validates.

| Path | What it is |
| --- | --- |
| `.agents/skills/<slug>-design-system/` | An Agent skill: `SKILL.md`, `references/`, and `assets/` |
| `<slug>-design-system-skill.zip` | The same skill, zipped |
| `replit.md` | A block to append to a project's `replit.md` |
| `custom-instructions.md` | A few lines for workspace custom instructions |
| `DESIGN.md` | Seed for Replit Design |

The skill's `assets/` holds token CSS, a plain `styles.css`, `tokens.json`, and
component source. `references/` holds tokens, components, and rules. The skill's
install step copies `assets/` to `src/design-system/<slug>/`.

**One project**

1. Unzip the skill into `.agents/skills/` so `SKILL.md` sits at `.agents/skills/<slug>-design-system/SKILL.md`.
2. Append `replit.md` to the project's `replit.md`.
3. Ask Agent to build something. It loads the skill when the task touches UI.

**Every project in a workspace**

1. In **Workspace Settings**, add the skill from the zip (or from a public GitHub repo). Skills require a paid plan.
2. Paste `custom-instructions.md` into workspace custom instructions. Those load on every message (Pro and Enterprise).

**Replit Design**

1. Start a design system from the home-page prompt box, or **Extract design system** from a mockup's menu.
2. Attach `DESIGN.md`, and optionally the token CSS, as the source.
3. Review the result, then **Save design system**.

Replit Design re-derives `tokens.json` and components from the seed, so the result is
close to this repo's design system rather than identical. The skill options carry this
repo's own CSS.

## Bolt.new

The script always writes `project-prompt.md` and `agent-instructions.md`. The source zip and tarball are added only when a component manifest validates.

| Path | What it is |
| --- | --- |
| `<slug>-design-system-<version>.tgz` | Built npm package: components, CSS, guidelines |
| `<slug>-design-system-source.zip` | The same system as a Vite + React + Tailwind source project, guidelines in `docs/` |
| `agent-instructions.md` | Text for the import's **Agent Instructions** field |
| `project-prompt.md` | Condensed description for a single project |
| `package/`, `source/` | The two archives, unpacked |

**A team design system (paid Team plan)**

1. On the Bolt home page, click **+** at the bottom-left of the chat box → **Import your design system**.
2. Choose **Set up myself**.
3. Under **Sources**, upload the tarball under **NPM** and the zip under **Files**. Once the package is published, the npm name can replace the tarball.
4. Paste `agent-instructions.md` into **Agent Instructions**.
5. Click **Generate**. Bolt reports back in about 45 to 60 minutes with a Storybook.
6. In a new chat, pick it from **Design System** in the toolbar, then **Build now**. For an existing project, attach it under project settings → **Design system**.

A team can add or sync 10 design systems per week. Docs alone produce a theme;
packages and repos produce components.

**A single project (any plan)**

Paste `project-prompt.md` as the first message and attach the tarball so Bolt can
install the package. Without the package, Bolt rebuilds components from the recipes.

## v0

The script always writes `import-notes.md` and `guidelines/`. The source zip, tarball, and a component registry (no guessed shadcn theme) are added only when a component manifest validates.

| Path | What it is |
| --- | --- |
| `<slug>-design-system-source.zip` | Vite + React + Tailwind v4 source, guidelines in `docs/`, plus a shadcn registry |
| `<slug>-design-system-<version>.tgz` | The same system as a built npm package |
| `import-notes.md` | Notes for globals, fonts, dark mode, and components |
| `source/`, `package/` | The two archives, unpacked |

The registry has two items under `source/public/r/`:

- `<slug>-theme`: colors, fonts, and radius as shadcn variables, with literal light and dark values.
- `<slug>-design-system`: token CSS, Tailwind theme, and components, installed to `src/design-system/<slug>/`.

**Design Systems 2.0**

1. Go to <https://v0.app/design-systems> and start an import.
2. Attach the zip. Attach the tarball as well if generated apps should install the package rather than copy the source. A public GitHub URL can replace the upload.
3. Paste `import-notes.md` in the notes step.
4. Review the starter app against the style-guide page: page background, fonts, button shapes, and primary color.
5. Approve. On a paid plan, a team owner can make the skill the team default.

**shadcn registry**

Host `source/public/r/` somewhere public, then:

```bash
npx shadcn@latest add https://YOUR-HOST/r/<slug>-theme.json
```

```bash
npx shadcn@latest add https://YOUR-HOST/r/<slug>-design-system.json
```

**Open in v0** (`https://v0.dev/chat/api/open?url=…`) opens an item's files and ignores
`cssVars`, `css`, and `envVars`. It can carry the design-system item, not the theme.

## Figma Make

The script always writes `guidelines/` and `tokens.css`. The npm package is added only when a component manifest validates.

| Path | What it is |
| --- | --- |
| `package/` | An already-built npm package: ESM, type declarations, CSS, and a copy of the guidelines |
| `<scope-name>-<version>.tgz` | The same package as `npm pack` would produce it |
| `guidelines/` | This repo's guidelines. `Guidelines.md` stays at the top |

The package needs React 18 or 19 as a peer dependency, one `styles.css`, and no other
runtime dependencies. Make's Vite environment requires that. Fonts load from Google
Fonts through `styles.css`.

**Publish**

Make installs from a registry. From `package/`: `npm login`, then
`npm publish --access public`. The scope has to be one you own.

For a Figma-hosted private registry (paid plans): **Admin** → **Resources** → **npm
registry** → **Manage scopes**. Create a scope that does not exist on public npm, copy
the configuration snippet into `package/.npmrc` (it contains a token; do not commit it),
set the package name to that scope, and publish. Registries reject a repeated version.

**Create the kit**

1. Open a new Make file. **Settings** (top right) → **Create a kit** → **Assemble your kit**.
2. Add the npm package by name. Make installs it and its peer dependencies.
3. Replace the file's `guidelines` folder with `guidelines/` from the export. `Guidelines.md` must stay at the top: it is the one file Make always reads.
4. Prompt a page and check that it imports the package, imports `styles.css` once, and uses the system's components.
5. Move the file out of Drafts, then **Publish kit**, keeping the default `package.json` and `vite.config.ts`.

Teammates attach it with **Add context** → **Select a Make kit**. To update, publish
the new package version, bump it in the kit, replace the guidelines, and **Update kit**.

Do not also add the Figma library's styles. Make flattens variables to raw values, and
they would compete with the CSS variables in the package.
