---
name: token-usage-review
description: Review whether design tokens are used for their intended purpose, beyond what validate can check. Use when the user invokes /token-usage-review, before opening a pull request that changes styles or components, or when asked to check that tokens are used appropriately.
---

# /token-usage-review

`validate` checks that code uses tokens and, through the token usage rules, that each token
sits in a property, selector, and pairing its source and the usage map allow. This review
covers the rest: whether the token's **meaning** fits the element. It is the third layer
of the token usage checks in
[`Docs/Design system/design-in-code architecture.md`](../../../Docs/Design%20system/design-in-code%20architecture.md#token-usage);
read that section first.

The review is advisory. It never gates CI, and it never edits the deviations backlog
except to write `Rationale:` lines.

## Inputs

- `<scope>`: the files to review. Default: the style and component files changed on this
  branch, `git diff --name-only <integration branch>...HEAD` plus uncommitted changes. The
  integration branch is named in `Agents/context/git-workflow.md`.

## Steps

### 1. Run `validate` first

Fix or give a rationale for every new `token-*` deviation in the backlog before reviewing
meaning. Don't re-report what the backlog already lists.

### 2. Load the intent

- The token manifest (its path is in `Code/ARCHITECTURE.md`): each token's `description`,
  `collection`, and `aliasOf`.
- `Docs/Design system/token-usage.json`: the `intent` line of each group a token in scope
  matches.
- The `Guidelines/` files for the token kinds in scope: `color.md` for colors and state
  layers, `typography.md`, `layout.md`, `shape.md`, `elevation.md`, `motion.md`. Their role
  tables ("Use for" / "Not for") and Do / Don't lists are the main source.
- `Docs/Design system/token-usage-review.md`, if it exists, so accepted entries are not
  reported again.

Where these say nothing, the token's name is the intent. Read it literally: an `error`
token is for errors, `body-to-subsection` spacing is for the gap between body text and a
subsection.

### 3. Review each token reference in scope

Check each one against the element it styles, as rendered, not only the rule block it is
in. Questions to ask:

- **Role.** Does the color role match the element's meaning? Primary for the main action,
  not decoration; error, warning, and success only for those states.
- **Emphasis.** Does the region keep the system's hierarchy: one primary action, quieter
  roles for the rest?
- **Pairing across elements.** `validate` compares only one rule block. Is the foreground
  token the `on-*` match for the background the element actually sits on, including a
  background set on an ancestor?
- **Contrast.** Does the pair hold up in every theme the tokens define, not only the
  default?
- **State.** Is the state layer the one for the content color it overlays, at the opacity
  the guideline gives for that state?
- **Type role.** Does the type-scale role match the content (display, headline, title,
  body, label), and do family, size, weight, line-height, and tracking come from the same
  role?
- **Relationship tokens.** Is a spacing, elevation, or shape token named for a relationship
  (`card-to-card`, `container-high`) used for that relationship?
- **Surface order.** Do nested containers step through surface or elevation levels in the
  order the guideline gives?
- **Component tokens.** Is a token scoped to one component (`--<prefix>-button-*`) used
  only in that component?
- **Primitives.** Is a primitive reached through a semantic token, even where `validate`
  can't tell (for example, a primitive's value copied into a semantic token's slot)?

### 4. Act on each finding

- **Clear misuse with a better token available:** fix it. Confirm the replacement exists
  in the generated token CSS; never guess a name.
- **Accepted, or no suitable token:** record it in
  `Docs/Design system/token-usage-review.md` (format below) with your best guess of why on
  its `Rationale:` line.
- **Genuinely unclear:** record it with `Rationale: Unknown — needs review`, which flags it
  for the design-system owner.

Remove entries from the review file whose code is gone or fixed.

### 5. Promote recurring findings

If a finding can be stated as a pattern (a token name, a property, a selector, or a
pairing), it belongs in `validate`, not in this review:

- A property restriction that Figma scopes can express: suggest the scope change for the
  library file.
- Otherwise: propose a narrowing edit to `Docs/Design system/token-usage.json` (a new
  group above a broader one, fewer `properties`, a `selectors` or `pairs` entry).

Make a map change as its own commit and name it in the reply, since it is a design-system
decision the owner reviews. Never widen a group to clear a finding.

### 6. Report

Reply with what you fixed, what you recorded, and any usage-map or scope changes you made or
suggest. If this runs before a pull request, list recorded findings under the PR's design
system deviations section.

## The review file

`Docs/Design system/token-usage-review.md` is written by hand by agents, not generated.
Create it on the first finding. Group entries by file; key each by token and property, not
line number:

```markdown
# Token usage review

Findings from the agent token usage review that `validate` cannot detect. Maintained by
hand; see `Agents/skills/token-usage-review/SKILL.md`.

## Open

### `<path/to/component>`

- **`--<prefix>-color-primary` in `background-color`** (`.card__badge`) — Primary fills a
  decorative badge beside the card's primary action, so the action loses emphasis.
  - Rationale: Unknown — needs review

## Accepted

### `<path/to/component>`

- **`--<prefix>-typescale-display-small-size` in `font-size`** (`.stat__value`) — A display
  role on a number inside a card.
  - Rationale: The stat is the card's headline content; the design uses display small
    here on purpose.
```

**Open** is the to-do list. **Accepted** is the record of legitimate exceptions; move an
entry there once its rationale explains why it stays.
