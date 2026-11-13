// Design-system export config — STUB. Fill it in once the stack and tokens exist.
//
// Everything the export engine (Agents/skills/design-system-export/) needs to
// know about this kit's design system lives here and in ./react/. The engine is
// the same in every kit; this file is what makes it specific to one system.
// Guide: Agents/skills/design-system-export/SKILL.md ("Setting up a kit").
//
// Paths in `sources` and `components[].source` are relative to Code/.
// Paths in `components[].react` are relative to this config's folder.
//
// Values marked TODO depend on the stack and the token namespace. The rest are
// sensible defaults for a Material 3–style system and can be trimmed.

export default {
  name: "TODO System name",
  slug: "todo", // lowercase, used in file and package names
  version: "0.1.0", // bump before each npm publish
  description: "TODO One sentence on the system's look and feel.",
  homepage: "https://example.com",
  package: {
    // A scope you can publish to. Only needed for the npm package targets.
    name: "@todo-scope/todo-design-system",
    license: "UNLICENSED",
  },

  // Command to print when a token file is missing (generated CSS is usually gitignored).
  prepare: "<tokens>", // the `tokens` role from Code/README.md

  // Specimen line on the generated style-guide page.
  sampleText: "The quick brown fox jumps over the lazy dog",

  sources: {
    // TODO The generated token CSS. Parsed into the model and re-emitted mode by mode.
    tokens: ["src/styles/tokens/index.css"],
    // TODO The minimal global stylesheet (reset, base type). Shipped in `@layer base`.
    base: ["src/styles/global.css"],
    // Supplemental sheets of custom properties, shipped as-is. Optional.
    extras: [],
  },

  modes: {
    // Color modes, default first. `selector` is how the token CSS writes each one;
    // `exportSelector` is what exports use, so they also answer to the `.dark`
    // class other stacks toggle. Mark modes most apps won't use `optional`.
    color: [
      { id: "light", label: "Light", selector: ":root" },
      {
        id: "dark",
        label: "Dark",
        dark: true,
        selector: ':root[data-theme="dark"]', // TODO
        exportSelector: ':root[data-theme="dark"], .dark',
      },
    ],
    // Responsive modes for type and spacing, smallest first. `media` must match
    // the token CSS exactly. One entry with `media: null` if nothing is responsive.
    window: [
      { id: "compact", label: "Compact", media: null, from: "0" },
      { id: "medium", label: "Medium", media: "(min-width: 37.5em)", from: "600px" },
      { id: "expanded", label: "Expanded", media: "(min-width: 52.5em)", from: "840px" },
    ],
  },

  // TODO Custom-property prefixes per category. Replace `kit` with the project's
  // namespace (`--<prefix>-*` in Agents/context/design-system.md).
  tokens: {
    color: {
      prefix: "--kit-sys-color-",
      // Color tokens matching a pattern are grouped; everything else is a core role.
      groups: {
        stateLayers: /^state-layers-/,
        palettes: /^palettes-/,
      },
    },
    // Type tokens are `<prefix><role>-<property>`, with properties font, size,
    // weight, line-height, tracking (and optionally weight-emphasized, opsz).
    typescale: { prefix: "--kit-sys-typescale-" },
    shape: { prefix: "--kit-sys-shape-corner-" },
    spacing: {
      prefix: "--kit-sys-spacing-",
      ui: "ui-", // component spacing steps
      breakpoints: "breakpoints-",
      // anything else under the prefix is treated as editorial spacing
    },
    elevation: { prefix: "--kit-sys-elevation-" },
    brand: { prefix: "--kit-ref-brand-" }, // fixed brand colors, if any
    font: { prefix: "--kit-ref-font-" },
  },

  fonts: [
    // TODO One entry per family. `variable` is the custom property that holds it.
    // `google: true` loads it from Google Fonts in the exports.
    {
      family: "Inter",
      role: "plain", // "plain" → font-sans, "brand" → font-serif / display, "mono" → font-mono
      variable: "--kit-ref-font-plain",
      use: "Body copy and UI.",
      fallback: "system-ui, sans-serif",
      weights: [400, 500, 600],
      google: true,
    },
  ],

  // shadcn/ui variable → color role key (the part after the color prefix) or any
  // CSS value. Most target platforms generate shadcn + Tailwind by default, so
  // this mapping is what makes their output use the system.
  shadcn: {
    radius: "medium", // shape key for --radius
    colors: {
      background: "surface",
      foreground: "on-surface",
      card: "surface-container-low",
      "card-foreground": "on-surface",
      popover: "surface-container",
      "popover-foreground": "on-surface",
      primary: "primary",
      "primary-foreground": "on-primary",
      secondary: "surface-container",
      "secondary-foreground": "on-surface",
      muted: "surface-container",
      "muted-foreground": "on-surface-variant",
      accent: "surface-container-high",
      "accent-foreground": "on-surface",
      destructive: "error",
      "destructive-foreground": "on-error",
      border: "outline-variant",
      input: "outline",
      ring: "primary",
    },
  },

  // Tailwind radius step → shape key.
  tailwind: {
    radius: {
      xs: "extra-small",
      sm: "small",
      md: "medium",
      lg: "large",
      "2xl": "extra-large",
    },
  },

  // DESIGN.md holds one value per token: which window mode supplies sizes, which
  // type roles to list, and component specs in DESIGN.md's own vocabulary
  // (backgroundColor, textColor, typography, rounded, padding, size, height, width).
  designMd: {
    windowMode: "expanded",
    // typography: ["headline-large", "body-large", "label-large"], // default: all roles
    components: {
      "button-primary": {
        backgroundColor: "{colors.primary}",
        textColor: "{colors.on-primary}",
        rounded: "{rounded.full}",
        height: "40px",
      },
    },
  },

  // Components to ship. Each needs a React port in react/ whose markup (class
  // names, data-* attributes) mirrors the original exactly: the styles are
  // lifted from `source`, not ported. Worked examples:
  // Agents/skills/design-system-export/examples/react/.
  components: [
    // {
    //   name: "Button",
    //   source: "src/components/Button.vue",
    //   react: "react/Button.tsx",
    //   summary: "Label button. The default action control.",
    //   props: [
    //     { name: "variant", type: '"filled" | "outlined"', default: '"filled"', description: "Emphasis." },
    //   ],
    //   usage: `<Button onClick={save}>Save</Button>`,
    //   showcase: `<Button>Filled</Button>\n<Button variant="outlined">Outlined</Button>`,
    //   notes: ["One filled button per view."],
    // },
  ],

  // Prose for every generated guideline. Distil it from Docs/Design system/Guidelines/:
  // agents on other platforms only know what is written here.
  guidance: {
    overview: ["TODO What the system is for and how it should feel."],
    principles: ["**TODO.** One line per principle."],
    // Color role key → when to use it. Roles without an entry show no usage.
    colorRoles: {
      primary: "Main actions and links.",
      "on-primary": "Text and icons on `primary`.",
      surface: "Page background.",
      "on-surface": "Primary text and icons.",
    },
    colorNotes: [],
    // Type role id → when to use it.
    typeRoles: {},
    typeNotes: [],
    layout: [],
    elevation: [],
    shapes: [],
    dos: [],
    donts: [],
    // How to build what the library does not ship: { name, body } each.
    recipes: [],
  },
};
