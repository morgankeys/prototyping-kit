// Exercises the exporter against a temporary kit. Not part of the template's Docs.
import { gunzipSync } from "node:zlib";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportDesignSystem } from "./export.mjs";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function write(file, content) {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

const overview = `# Overview

## Summary

A calm product UI for reading long articles.

## Principles

1. **Quiet** — chrome recedes so the text leads.
`;

const colorModes = {
  color: {
    primary: {
      $type: "color",
      $value: {
        light: {
          hex: "#112233",
          alpha: 1,
          components: { red: 17 / 255, green: 34 / 255, blue: 51 / 255 },
        },
        dark: {
          hex: "#AABBCC",
          alpha: 0.5,
          components: { red: 170 / 255, green: 187 / 255, blue: 204 / 255 },
        },
      },
    },
    scrim: {
      $type: "color",
      $value: {
        hex: "#000000",
        alpha: 0.32,
        components: { red: 0, green: 0, blue: 0 },
      },
    },
  },
  font: { weight: { $type: "number", $value: 500 } },
};

const inventory = `# Components

## Inventory

| Component | Figma | Code | Story | Code Connect | Notes |
| --- | --- | --- | --- | --- | --- |
| <Name> | \`<Figma node link>\` | \`Code/<path>\` | \`<story id>\` | | gaps |
| Button | | Code/Button.vue | | | |
`;

const source = `<button class="btn" data-kind="primary">Go</button>\n`;
const port = `export default function Button() {
  return <button className="btn" data-kind="primary">Go</button>;
}
`;

function fixture(dir) {
  write(join(dir, "Docs/Design system/Guidelines/overview.md"), overview);
  write(join(dir, "Docs/Design system/Guidelines/components.md"), inventory);
  write(join(dir, "Docs/Design system/Figma/Tokens/unpacked/Color/modes.tokens.json"), `${JSON.stringify(colorModes, null, 2)}\n`);
  write(join(dir, "Docs/Design system/Supplemental/Light.tokens.json"), JSON.stringify({
    spacing: { page: { $type: "number", $value: 16 } },
  }));
  write(join(dir, "Docs/Design system/Supplemental/Dark.tokens.json"), JSON.stringify({
    spacing: { page: { $type: "number", $value: 24 } },
  }));
  write(join(dir, "Code/Button.vue"), source);
}

export function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "ds-export-"));
  const repo = join(root, "repo");
  const components = join(root, "components");
  const out = join(root, "out");
  try {
    fixture(repo);
    const docsOnly = exportDesignSystem({ repo, out, componentsDir: components, targets: [] });
    assert(docsOnly.components.length === 0, "docs-only export attached a component");
    const css = readFileSync(join(out, "lovable/guidelines/setup.md"), "utf8");
    assert(css.includes("data-mode"), "setup did not mention data-mode");
    const tokens = readFileSync(join(out, "figma-make/tokens.css"), "utf8");
    assert(tokens.includes("--color-primary: #112233;"), `missing light primary\n${tokens}`);
    assert(tokens.includes("--color-scrim: rgb(0 0 0 / 0.32);"), `scrim lost its alpha\n${tokens}`);
    assert(tokens.includes('--color-primary: rgb(170 187 204 / 0.5);'), `dark primary lost its alpha\n${tokens}`);
    assert(tokens.includes(':root[data-mode="dark"]'), "dark mode selector missing");
    assert(tokens.includes("--font-weight: 500;"), "font weight gained a unit");
    assert(tokens.includes("--spacing-page: 16px;"), "default spacing missing");
    assert(tokens.includes("--spacing-page: 24px;"), "dark spacing missing");
    const instructions = readFileSync(join(out, "lovable/instructions.md"), "utf8");
    assert(instructions.length <= 10000, "instructions over the limit");
    assert(instructions.includes("chrome recedes"), "guideline text missing");
    assert(!existsSync(join(out, "lovable/project/src/components/Button.tsx")), "component shipped without a manifest");
    const designReadme = readFileSync(join(out, "design-md/README.md"), "utf8");
    assert(designReadme.includes("/export-design-md"), "DESIGN.md target did not point at the existing export");
    assert(!existsSync(join(out, "design-md/DESIGN.md")), "a second DESIGN.md was written");

    write(join(components, "Button.tsx"), port);
    write(join(components, "manifest.json"), JSON.stringify({
      components: [{ name: "Button", source: "Code/Button.vue", file: "Button.tsx", summary: "The action." }],
    }));
    const withPort = exportDesignSystem({ repo, out, componentsDir: components, targets: ["lovable", "bolt"] });
    assert(withPort.components.join() === "Button", "valid port was not attached");
    const packed = readFileSync(join(out, "lovable/design-system-lovable-design-system.zip"));
    assert(packed.subarray(0, 2).toString() === "PK", "zip magic missing");
    assert(packed.includes(Buffer.from("src/components/Button.tsx")), "zip is missing the port");
    const tgz = gunzipSync(readFileSync(join(out, "bolt/design-system-design-system-0.0.0.tgz")));
    assert(tgz.includes(Buffer.from("src/index.ts")), "tarball is missing the barrel");

    write(join(components, "Button.tsx"), port.replace("btn", "other"));
    const rejected = exportDesignSystem({ repo, out, componentsDir: components, targets: ["lovable"] });
    assert(rejected.components.length === 0, "bad class was packaged");
    assert(rejected.warnings.some((line) => line.includes("class other")), `warning missing\n${rejected.warnings.join("\n")}`);
    assert(existsSync(join(out, "lovable/instructions.md")), "docs package was dropped with the component");
    assert(!existsSync(join(out, "lovable/project/src/components/Button.tsx")), "rejected port was written");

    const empty = join(root, "empty");
    mkdirSync(join(empty, "Docs/Design system/Guidelines"), { recursive: true });
    write(join(empty, "Docs/Design system/Guidelines/overview.md"), "# Overview\n\n## Summary\n\n…\n");
    let code = 0;
    try {
      exportDesignSystem({ repo: empty, out: join(root, "empty-out"), componentsDir: components, targets: ["lovable"] });
    } catch (err) {
      code = err.code;
    }
    assert(code === 3, `empty kit exited ${code}`);

    const huge = join(root, "huge");
    mkdirSync(join(huge, "Docs/Design system/Guidelines"), { recursive: true });
    write(join(huge, "Docs/Design system/Guidelines/overview.md"), `# Overview\n\n## Summary\n\n${"word ".repeat(2500)}\n`);
    let limited = false;
    try {
      exportDesignSystem({ repo: huge, out: join(root, "huge-out"), componentsDir: components, targets: ["lovable"] });
    } catch (err) {
      limited = /10,000/.test(err.message);
    }
    assert(limited, "over-long prompt was accepted");
    console.log("self-test ok");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
