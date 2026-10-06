# Guidelines for implementing the design system in code

The following are general requirements for how the design system should be architected in
code, whatever the stack. These principles should be enforced via linting or validation
scripts.

* There is a global variables file, built directly from tokens exported from Figma.
* There is a global CSS file that contains a minimal set of universal styles. For example,
  type settings.
* Component styles should be contained and scoped to the component itself.
* Raw or hardcoded CSS values should be minimized. Wherever possible, token-based variables
  should be used.
* There is a design-system validation script/mechanism (run either automatically or
  on-demand) that assesses code based on these principles and generates a list of
  identified deviations.
* Code-linting should be used within or alongside validation.

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
