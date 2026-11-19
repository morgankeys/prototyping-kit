// One function per platform. Each returns { files, archives }. Archives are
// { name, format: "zip" | "tgz", files }.
import { tarGz, zipStore } from "./archive.mjs";
import {
  MARKER,
  assertPromptLimit,
  guidelineFolder,
  instructions,
  libraryFiles,
} from "./model.mjs";

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function withGuidelines(prefix, guidelines) {
  return Object.fromEntries(Object.entries(guidelines).map(([path, content]) => [`${prefix}${path}`, content]));
}

function designMd() {
  return {
    files: {
      "README.md": `# DESIGN.md

${MARKER}

This export does not write a second DESIGN.md. Run \`/export-design-md\` and use \`Export/DESIGN.md\`. That file is the portable summary of the same Docs.

- AI Studio: attach it in Build mode, or paste it into System instructions.
- Stitch: import it as the project's design system.
- Any repo-reading agent: commit it at the repository root.
- Lint with \`npx @google/design.md@0.4.0 lint Export/DESIGN.md\`.
`,
    },
  };
}

function lovable(model) {
  const text = instructions(model);
  assertPromptLimit("Lovable instructions.md", text);
  const guidelines = guidelineFolder(model);
  const files = {
    "instructions.md": text,
    ...withGuidelines("guidelines/", guidelines),
    "README.md": lovableReadme(model),
  };
  const archives = [];
  const library = libraryFiles(model);
  if (library) {
    const project = {
      ...library,
      ...withGuidelines(".lovable/rules/", guidelines),
      ".lovable/system.md": text,
      "README.md": `# ${model.name} for Lovable\n\n${MARKER}\n\n\`src/\` is the library. \`src/styles/tokens.css\` holds the tokens. Components are exported from \`src/index.ts\`.\n`,
    };
    Object.assign(files, withGuidelines("project/", project));
    archives.push({ name: `${model.slug}-lovable-design-system.zip`, format: "zip", files: project });
  }
  return { files, archives };
}

function lovableReadme(model) {
  const library = model.components.length
    ? `\n\`${model.slug}-lovable-design-system.zip\` is the library project, present because the component manifest validated. Upload it when creating a Lovable design system: **+** → **Design** → **Use a design system** → **Create design system**, then tell Lovable to keep \`src/\` and \`.lovable/\` as the library source and click **Release version**.\n`
    : "\nNo component zip is included. The inventory has no ported components that passed the checks, so this package is the instructions and guidelines only.\n";
  return `# ${model.name} → Lovable

${MARKER}
${library}
## Instructions (all plans)

1. Open **Project settings** → **Instructions** (or **Workspace settings** → **Instructions**).
2. Paste \`instructions.md\`.

\`guidelines/\` is the same material as separate files. Lovable also reads a top-level \`AGENTS.md\` on every message.
`;
}

function replit(model) {
  const skill = `${model.slug}-design-system`;
  const dir = `.agents/skills/${skill}`;
  const assets = {
    "tokens.css": model.tokensCss,
    "tokens.json": json(model.tokens.map((token) => ({
      name: `--${token.name}`,
      value: token.css ?? token.modes,
    }))),
  };
  for (const component of model.components) {
    assets[`components/${component.file}`] = component.code;
    if (component.css) assets[`components/${component.cssFile}`] = component.css;
  }
  const guidelines = guidelineFolder(model);
  const skillFiles = {
    "SKILL.md": `---
name: ${skill}
description: Apply the ${model.name} design system whenever building or changing UI.
---

# ${model.name}

${MARKER}

Copy \`assets/\` into the project once, then import \`assets/tokens.css\` (or the copied file) before other CSS.

${model.components.length ? `Use these components: ${model.components.map((component) => component.name).join(", ")}.` : "This package has tokens and guidelines. It does not include components."}
`,
    ...withGuidelines("references/", guidelines),
    ...withGuidelines("assets/", assets),
  };
  return {
    files: {
      ...withGuidelines(`${dir}/`, skillFiles),
      "replit.md": `## Design system\n\nThis project uses the ${model.name}. Read \`${dir}/SKILL.md\` before changing UI. Tokens are in \`${dir}/assets/tokens.css\`.\n`,
      "custom-instructions.md": `Always apply the ${model.name}. Read the skill at \`${dir}/\` and use its CSS variables. Do not hardcode colors, font sizes, radii, or spacing.\n`,
      "README.md": `# ${model.name} → Replit

${MARKER}

| Path | What it is |
| --- | --- |
| \`${dir}/\` | Agent skill: instructions, references, and \`assets/\` |
| \`replit.md\` | Block to append to a project's \`replit.md\` |
| \`custom-instructions.md\` | Workspace custom instructions |

Unzip the skill into \`.agents/skills/\` for one project, or add the zip in **Workspace Settings**. For Replit Design, attach \`Export/DESIGN.md\` from \`/export-design-md\` as the seed. Replit Design re-derives tokens, so the skill is the copy that carries this kit's CSS.

${model.components.length ? "Component source is under `assets/components/` because the manifest validated." : "No component source is included."}
`,
    },
    archives: [{ name: `${skill}-skill.zip`, format: "zip", files: skillFiles }],
  };
}

function bolt(model) {
  const prompt = instructions(model);
  assertPromptLimit("Bolt project-prompt.md", prompt);
  const guidelines = guidelineFolder(model);
  const agent = `This is the ${model.name}. Use the custom properties in tokens.css for color, type, spacing, and radius. Read Guidelines.md first. Do not invent a different palette.\n`;
  const files = {
    "project-prompt.md": prompt,
    "agent-instructions.md": agent,
    ...withGuidelines("guidelines/", guidelines),
  };
  const archives = [];
  const library = libraryFiles(model);
  if (library) {
    const source = { ...library, ...withGuidelines("docs/", guidelines) };
    Object.assign(files, withGuidelines("source/", source), withGuidelines("package/", library));
    archives.push(
      { name: `${model.slug}-design-system-source.zip`, format: "zip", files: source },
      { name: `${model.slug}-design-system-0.0.0.tgz`, format: "tgz", files: library },
    );
  }
  const extra = model.components.length
    ? `The zip and tarball are included. On a Team plan: **+** → **Import your design system** → **Set up myself**, upload the tarball under **NPM** and the zip under **Files**, paste \`agent-instructions.md\`, then **Generate**.\n`
    : "No npm package is included. Docs alone give Bolt a theme. Paste `project-prompt.md` as the first message of a project.\n";
  files["README.md"] = `# ${model.name} → Bolt.new\n\n${MARKER}\n\n${extra}\n\`project-prompt.md\` stays under 10,000 characters. \`agent-instructions.md\` is the import field.\n`;
  return { files, archives };
}

function v0(model) {
  const notes = `${instructions(model)}\nNothing is deprecated.\n`;
  const guidelines = guidelineFolder(model);
  const files = {
    "import-notes.md": notes,
    ...withGuidelines("guidelines/", guidelines),
  };
  const archives = [];
  const library = libraryFiles(model);
  if (library) {
    const registryItems = model.components.map((component) => ({
      name: component.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
      type: "registry:component",
      title: component.name,
      files: [
        { path: `src/components/${component.file}`, type: "registry:component" },
        ...(component.css ? [{ path: `src/components/${component.cssFile}`, type: "registry:component" }] : []),
      ],
    }));
    const source = {
      ...library,
      ...withGuidelines("docs/", guidelines),
      "registry.json": json({ name: model.slug, items: registryItems }),
    };
    Object.assign(files, withGuidelines("source/", source), withGuidelines("package/", library));
    archives.push(
      { name: `${model.slug}-design-system-source.zip`, format: "zip", files: source },
      { name: `${model.slug}-design-system-0.0.0.tgz`, format: "tgz", files: library },
    );
  }
  const extra = model.components.length
    ? "The source zip includes a shadcn registry of the ported components and no theme item. shadcn color names are not guessed. At v0.app/design-systems, attach the zip and paste `import-notes.md`.\n"
    : "No source zip is included. Paste `import-notes.md` with the import, or attach `Export/DESIGN.md`.\n";
  files["README.md"] = `# ${model.name} → v0\n\n${MARKER}\n\n${extra}`;
  return { files, archives };
}

function figmaMake(model) {
  const guidelines = guidelineFolder(model);
  const files = { ...withGuidelines("guidelines/", guidelines), "tokens.css": model.tokensCss };
  const archives = [];
  const library = libraryFiles(model);
  if (library) {
    const pkg = { ...library, ...withGuidelines("guidelines/", guidelines) };
    Object.assign(files, withGuidelines("package/", pkg));
    archives.push({ name: `${model.slug}-0.0.0.tgz`, format: "tgz", files: pkg });
  }
  const publish = model.components.length
    ? `\`package/\` is the library plus a copy of the guidelines. Publish it (\`npm publish\`) before creating the kit, then in Make: **Settings** → **Create a kit**, add the package, and replace the file's \`guidelines\` folder with \`guidelines/\` here. \`Guidelines.md\` stays at the top.\n`
    : "No package is included. \`guidelines/\` and \`tokens.css\` are what Make can take from Docs alone. A Make kit's npm package is added when the component manifest validates.\n";
  files["README.md"] = `# ${model.name} → Figma Make\n\n${MARKER}\n\n${publish}\nDo not also add the Figma library's styles. Make flattens variables to raw values, and they would compete with tokens.css.\n`;
  return { files, archives };
}

export const TARGETS = {
  "design-md": { title: "DESIGN.md", build: designMd },
  lovable: { title: "Lovable", build: lovable },
  replit: { title: "Replit", build: replit },
  bolt: { title: "Bolt.new", build: bolt },
  v0: { title: "v0", build: v0 },
  "figma-make": { title: "Figma Make", build: figmaMake },
};

export function renderArchives(archives) {
  const out = {};
  for (const archive of archives) {
    const packed = archive.format === "tgz" ? tarGz(archive.files) : zipStore(archive.files);
    out[archive.name] = packed;
  }
  return out;
}
