# Guidelines for implementing the design system in code

The following are general requirements for how the design system should be architected in
code, whatever the stack. These principles should be enforced via linting or validation
scripts.

* There is a global variables file, built directly from the source-of-truth tokens. A Figma
  variables export is the default source; the same file is built when tokens are maintained
  in this kit, another repository, or another design tool.
* There is a global CSS file that contains a minimal set of universal styles. For example,
  type settings.
* Component styles should be contained and scoped to the component itself.
* Raw or hardcoded CSS values should be minimized. Wherever possible, token-based variables
  should be used.
* Each token is used for its intended purpose, as recorded in the token source and the
  token usage map. See [Token usage](#token-usage).
* There is a design-system validation script/mechanism (run either automatically or
  on-demand) that assesses code based on these principles and generates a list of
  identified deviations.
* Code-linting should be used within or alongside validation.

## Validator contract

Any validator, in any language, implements these rules. Each finding becomes one backlog
entry with a rule id, a line, and a detail string. Rule ids below are suggestions; keep
them stable once chosen, because rationale is matched on them.

| Rule | Flags |
| --- | --- |
| `hardcoded-color` | A literal color (hex, `rgb()`, `hsl()`, named) in a color property **or** a color-bearing shorthand (`border*`, `outline`, `background*`, `box-shadow`, `text-shadow`), including as a `var()` fallback. |
| `raw-spacing` | A raw length in `margin`, `padding`, `gap`, `row-gap`, or `column-gap`, including one mixed with a token or inside `calc()`. |
| `raw-border-radius` | A raw length in `border-radius` or its longhands. |
| `non-token-font-family` | A `font-family` that does not resolve through a token. |
| `raw-font-size` | A raw length in `font-size`. |
| `raw-typography` | A literal `font-weight`, `line-height`, or `letter-spacing`. |
| `non-token-variable` | A CSS variable outside the project's token namespace (`--<prefix>-*`). |
| `local-token-override` | A component redefining a namespace token with a literal value. |
| `unscoped-style` | A style block in a component file that is not scoped. |
| `global-component-leak` | Component-level selectors or styling in the global stylesheet. |

Allowed values the rules ignore (`0`, `inherit`, `auto`, `transparent`, `currentcolor`, and
so on), explicit exemptions (a file that defines primitives the export lacks), and how the
validator finds component style blocks are stack decisions: record them in
`Code/ARCHITECTURE.md`.

The validator also implements the backlog interface below: regenerate, carry rationale
forward, write only on change, and the exit codes under [Exit codes and CI](#exit-codes-and-ci).

## Token usage

The rules above check that code uses tokens. The rules here check that it uses each token
**for what it is meant for**: a spacing token in `font-size`, an `on-primary` text color as
a background, or a hover state layer on a resting element all pass the rules above and
still break the system.

Intended use is checked in three layers, most deterministic first. Each layer handles only
what the one before it cannot.

| Layer | Source of intent | Checked by | Findings go to |
| --- | --- | --- | --- |
| 1. Token source | Figma variable scopes (`$extensions` → `com.figma.scopes`) and `$description` | `validate` | The deviations backlog |
| 2. Usage map | `Docs/Design system/token-usage.json`, hand-maintained | `validate` | The deviations backlog |
| 3. Semantic review | Token names, descriptions, the usage map's `intent` lines, and `Guidelines/` | An agent, with the [`token-usage-review`](../../Agents/skills/token-usage-review/SKILL.md) skill | `Docs/Design system/token-usage-review.md` |

When the agent review keeps finding the same kind of misuse, the fix is to encode it in
layer 1 or 2 so `validate` catches it from then on. The review exists for what can't be
expressed as a pattern.

### Layer 1: the token source

A Figma variable records where it may be applied: its scopes (`TEXT_FILL`, `GAP`,
`CORNER_RADIUS`, …) are set by the designer in the variable's settings and exported with it.
`tokens` writes a generated **token manifest** next to the token CSS, one entry per CSS
variable:

```json
{
  "--<prefix>-color-on-primary": {
    "type": "color",
    "collection": "Color",
    "scopes": ["TEXT_FILL", "STROKE_COLOR"],
    "description": "Text and icons on primary.",
    "aliasOf": "--<prefix>-ref-palette-primary-100"
  }
}
```

`scopes` and `description` come straight from the export; omit what the source lacks.
`aliasOf` is set when the token's value references another token. Tokens from outside
Figma can supply the same fields. Where the manifest lives is a stack decision; record it in
`Code/ARCHITECTURE.md`. It is generated: never hand-edit it.

The usage map's `figmaScopes` table translates each scope into CSS properties. A token
whose scopes are `ALL_SCOPES`, or empty, has no restriction from this layer.

Setting scopes in Figma is the cheapest way to make intent checkable, and it also keeps the
token out of the wrong pickers for designers. Prefer it to a usage-map entry whenever a
scope can express the rule.

### Layer 2: the usage map

[`token-usage.json`](token-usage.json) records intent that scopes can't: which selectors a
token belongs in, which tokens pair with which, and which tokens are not for direct use. It
is authored by the design-system owner. The template ships an example for a Material-style
system; replace it with the project's own groups.

- **`namespace`**: the token prefix, without dashes. Patterns below are written after
  `--<namespace>-`.
- **`propertySets`**: named property lists, referenced as `@name`. A trailing `*` in a
  property matches any longhand (`padding*` matches `padding-inline-start`), and a `*`
  inside one matches a segment (`border-*-radius`).
- **`figmaScopes`**: scope → property list, used by layer 1.
- **`groups`**: ordered; **the first group whose `match` fits a token wins.** Put specific
  groups above general ones. Each group has:

| Field | Meaning |
| --- | --- |
| `id` | Stable name, quoted in findings. Renaming it drops carried-forward rationale. |
| `match` | Name pattern. `*` matches any run of characters. `{name}` captures one or more hyphen-separated segments, as many as still let the pattern match, for use in `pairs` and `intent`. |
| `collection` | Optional. The group only matches tokens from this manifest collection. |
| `intent` | One line saying what the token is for. Read by the agent review; not checked. |
| `properties` | The CSS properties the token may appear in. Omitted means no restriction from this group. |
| `direct` | `false` means the token is never used in component code, only through other tokens. |
| `selectors` | Optional. The token may only appear in a rule whose selector contains one of these strings. |
| `pairs` | Optional. Each entry is `{ properties, tokens }`: when the same rule block sets one of `properties` from a namespace token, that token must match one of the `tokens` patterns. `{name}` is filled in from the token's own match. |

### Usage rules

`validate` implements these alongside the rules in the [validator contract](#validator-contract).
They apply to every namespace token referenced in a declaration's value, including inside
`calc()` and as a `var()` fallback, in every file the validator scans except the generated
token files. A declaration that defines a custom property is skipped, because its target
property is not known there.

| Rule | Flags |
| --- | --- |
| `token-wrong-property` | A token in a property outside its Figma scopes, or outside its usage-map group's `properties`. A token must pass both when both apply. |
| `token-not-for-direct-use` | A token whose group sets `direct: false`. |
| `token-wrong-context` | A token whose group sets `selectors`, in a rule whose selector contains none of them. |
| `token-unpaired` | A rule block whose tokens break a group's `pairs`, such as `on-primary` text on a `surface` background. Only declarations in the same block are compared. |
| `token-unclassified` | A token with no restricting scope and no usage-map group: nothing records what it is for. |

Detail strings name the token, the property, and the group or scopes, and nothing that
changes when unrelated map entries change, so rationale carries forward. For example:
`` `--<prefix>-spacing-md` in `font-size` is outside group `spacing`. ``

`validate` also prints, without adding to the backlog, a warning for each usage-map group
that matches no token in the manifest. After an export renames tokens, that is the sign the
map needs updating.

The usage map is held to the same standard as lint rules: **never widen a group** (add a
property, a selector, or a pair) to make a deviation disappear. Widening is a design-system
decision for the owner. Until it is made, the deviation stays in the backlog with its
rationale.

### Layer 3: semantic review

Some misuse depends on meaning no pattern captures: the primary color on a decorative
element, a `display` type role on body copy, `on-surface` text inside a child of a
`primary` container, a spacing token named for one relationship used for another. An agent
reviews this with the
[`token-usage-review`](../../Agents/skills/token-usage-review/SKILL.md) skill.

By default the review covers only **recently changed tokens**. That means token uses in
rule blocks or markup the change touches, and every use of a token whose value, scopes,
description, usage-map group, or guideline changed. A `full` option reviews every token
reference in the codebase, for first adoption, after an overhaul of the guidelines or usage
map, and before a promotion to production. Layers 1 and 2 always scan everything: they are
cheap, and `validate` rewrites the whole backlog on each run, so a partial scan would drop
entries and fail the CI check for a stale backlog.

Its findings are advisory and never gate CI. They live in
`Docs/Design system/token-usage-review.md`, which the agent maintains by hand (it is not
generated). Each entry is keyed by file, token, and property, with a `Rationale:` line in
the same form as the backlog.

## Handling deviations

Design-system validation creates and updates a running backlog of deviations,
`Docs/Design system/deviations-backlog.md`. The list serves as a to-do list for future
agents and clean-up efforts, and as a transparent record of legitimate exceptions. It is
not a place to hide violations.

### The backlog and its rationale contract

- **Regenerated on every run.** The `validate` command rewrites the backlog from scratch:
  grouped by file, one entry per deviation giving its line, rule, and detail, with a
  `Rationale:` line under it. A short header says it is generated and gives counts by
  rule.
- **`Rationale:` lines are the one editable part.** Everything else is generated. Before
  rewriting, the validator parses the previous backlog and carries each rationale forward
  by matching **file + rule + detail**. Line numbers are not part of the match, so they
  drift freely. Nobody copies a key by hand.
- **New deviations get a sentinel.** A deviation with nothing carried forward gets
  `Unknown — needs review`. Agents write their best guess of why instead; the sentinel
  stays only when the reason is genuinely unclear, which flags it for the owner.
- **Fixed or reworded deviations drop their rationale.** When a deviation disappears or its
  detail text changes, its rationale is dropped on the next run. Because the backlog is
  tracked in git, the loss shows in `git diff`.
- **Written only when its content changes.** A run that finds the same deviations and
  rationale leaves the file untouched, so it never shows up as a spurious diff.

Example entry:

```markdown
### `<path/to/component>`

- **L86 · local-token-override** — `--<prefix>-color-surface` redefines a namespace token with a literal value: `#221f17`.
  - Rationale: This overlay always sits on a dark scrim, so the color is pinned to the dark
    theme's value. No token expresses "always dark".
- **L87 · raw-spacing** — `padding: 20px` uses a raw length.
  - Rationale: Unknown — needs review
```

### Exit codes and CI

- `validate` prints a summary and **exits 0 with deviations present**. Deviations are a
  warning, not a failure.
- `validate --strict` exits 1 when any deviation exists, on count alone. It is a
  local-only flag; CI does not use it.
- **Rationale never gates.** A deviation with no rationale is reported the same way as one
  with a full explanation, in both modes.
- CI runs `validate`, then `git diff --exit-code`. The only way validation fails CI is a
  **stale backlog**: code changed, the backlog it produces changed, and the committed copy
  was not updated.

### Working a deviation

1. Check whether a suitable token exists (search the generated token CSS; never guess a
   name).
2. If one does, use it.
3. If none does, leave the deviation in the backlog and write its `Rationale:` line.
4. If it is technical debt, log it the same way and add a TODO comment in the code.

Never disable a lint rule, add an ignore comment, or delete a backlog entry to make a
deviation disappear.
