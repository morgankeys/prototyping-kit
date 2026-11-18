---
name: setup
description: Review how far this kit is set up and walk the user through what's left. Checks the repo against the canonical setup checklist (stack, token pipeline, validator, linters, Figma tools, component catalog, unfilled stubs), records progress in Docs/setup-status.md, and respects opt-outs. Use when the user invokes /setup, starts a new kit, asks what still needs setting up or installing, or wants to skip or re-enable a tool.
---

# /setup

Checks the kit against the setup checklist, reports what is left, and walks the user
through it one step at a time.

Two files, kept apart on purpose:

- **[`checklist.md`](checklist.md)** — the canonical definitions: every item, who does it,
  what it needs first, and how to tell it is done. Never record progress in it.
- **`Docs/setup-status.md`** — this kit's progress, one row per item id. This skill
  creates and maintains it; people may edit it by hand.

This file holds the steps only. What each item means is in the checklist; how to do an
item is in the skill or doc its row links to.

Safe to rerun at any point in a project. A run with nothing to do just reports that.

| Invocation | Does |
| --- | --- |
| `/setup` | Check everything, report, then offer the next step. |
| `/setup status` | Check and report only. Change nothing but the status file. |
| `/setup skip <item or tool>` | Opt out (step 5). |
| `/setup include <item or tool>` | Undo an opt-out, or opt in to an `optional` item. |

## Steps

### 1. Scan

```bash
node Agents/skills/setup/scripts/setup-scan.mjs
```

It reads the checklist and prints the facts that need no judgment: template or kit, the
Figma decision, how the status file compares with the checklist, and every open stub with
its line numbers. Then read [`checklist.md`](checklist.md) in full.

**If the scan says this is the template** (`new-kit.sh` is present), ask the user which it
is before going further:

- *The template:* report the scan and stop. Setup progress is never tracked in the
  template, and `Docs/setup-status.md` must not exist there. To start a kit, the user runs
  `./new-kit.sh`.
- *A kit copied or forked by hand:* do `kit-provenance` first. Add the provenance line to
  `README.md`, then delete `new-kit.sh` and every `template-only` block, as
  [`kit-structure.md`](../../context/kit-structure.md#kit-provenance) describes. Then
  continue.

### 2. Sync the status file

```bash
node Agents/skills/setup/scripts/setup-scan.mjs sync
```

Creates `Docs/setup-status.md` on the first run, and afterwards adds a row for any item
the checklist has gained. It never changes an existing row. If the scan listed rows whose
item is no longer in the checklist, tell the user and delete those rows.

### 3. Evaluate every item

Go through the checklist in order and settle each row's status from the repo, not from
what the row said last time:

| Status | When |
| --- | --- |
| `done` | Its "Done when" holds right now. |
| `waiting` | Something it needs isn't `done`. Name what in Notes: the item id, and the person if it is a `user` item. |
| `todo` | Everything it needs is `done`, and it isn't. |
| `opted out` | The user said to skip it. Only this skill's step 5, or the user's own edit, sets this. |
| `n/a` | It can never apply: a `figma-*` item when the project says `Figma: not used`, an item that needs one that is opted out, or a tool the stack can't use. Say why in Notes. |

Rules for the pass:

- **Recheck `done` rows.** Verify each against its "Done when" again. If it no longer
  holds, set it back to `todo` and say in the report what regressed. A stub the scan
  lists as open under a `done` item is exactly this case.
- ***Ask* items are the exception.** They can't be seen from the repo. Keep a `done` the
  user already gave; ask only when the row is still `todo`, and batch those questions
  into one message.
- **Leave `opted out` alone.** Don't recheck it, and don't raise it again.
- **Prefer evidence to commands.** Read manifests, configs, and scripts first. Run a
  role's command (`lint`, `build`, `validate`, `stories-build`, `connect`) only when
  dependencies are already installed; otherwise judge from the files and say the command
  was not run. Never install anything during the check.
- **Don't guess.** If you can't tell, the row stays `todo` with the open question in
  Notes.

Write the result to `Docs/setup-status.md`: Status, today's date under Checked for every
row you verified, and Notes kept to one line (what is missing, what it waits on, or why it
was skipped). Keep Notes a person wrote unless they are now wrong.

### 4. Report

One message, in this order. Use plain words for each item, with its id in backticks so
the user can refer to it. Leave out any group that is empty.

1. **Where things stand:** one line, such as "14 of 31 done, 3 skipped".
2. **Regressions:** rows that were `done` and no longer are.
3. **Your turn:** `todo` items only the user can do, each with the exact action (which
   file to export, where to drop it, which setting to change) and a link.
4. **Ready for me:** `todo` items an agent can do now, in checklist order.
5. **Waiting:** grouped by what unblocks them, such as "5 items wait on the token
   export".
6. **Optional, not decided:** `optional` items nobody has ruled on. Offer each once; if
   the user declines, record `opted out` so it isn't offered again.
7. **Still stubbed:** `anytime` items, as counts ("7 of 10 guideline files are stubs").
8. **Skipped:** opted-out items in one line, so the user can change their mind.

End with the single next step you recommend, and wait. With `/setup status`, stop here.

### 5. Opt-outs

The user can skip any `default` or `optional` item, a whole group ("no linters"), or a
tool by name ("skip Storybook") at any point, including in answer to the report.

- Set the row to `opted out`, with the date and the user's reason in Notes. Set the items
  that need it to `n/a`.
- A `required` item can't be skipped. Say which kit rule depends on it (the checklist row
  links to it) and what breaks without it. The choice of tool is still open: any
  converter, validator language, or workbench that meets the contract counts.
- Skipping Figma altogether is not a row edit: write `Figma: not used` in both files that
  `kit-figma` names. Every `figma-*` item becomes `n/a`, and
  [`component-catalog.md`](../../context/component-catalog.md#not-using-figma) lists the
  placeholders that can then be deleted.
- After an opt-out, offer to delete the placeholders that piece left behind (the scan
  shows them as open stubs), so they don't read as unfinished work. Where the checklist
  item says a role becomes `n/a`, write that in `Code/README.md`.
- `/setup include <item>` sets the row back to `todo` and re-evaluates it.

### 6. Walk through what's left

Work in checklist order, one item at a time, and re-run the scan after each.

- **`user` items:** give the exact action, then wait. When the user says it is done,
  verify what can be verified before marking it.
- **`agent` items:** say what you are about to install or write, then do it by following
  the skill or doc the checklist row links to. Don't restate or improvise its procedure.
  Tokens go through [`design-tokens`](../design-tokens/SKILL.md); the workbench and Code
  Connect go through [`/component-catalog`](../component-catalog/SKILL.md).
- **`both` items:** ask for the decision first (which stack, which groups), then do the
  work.
- **Tools:** before installing one, read its entry in
  [`Docs/Tooling.md`](../../../Docs/Tooling.md) for where to get it and its gotchas. Pin
  the version. If the user would rather use a different tool for the same job, use it and
  record it in `Code/ARCHITECTURE.md`.
- **Branches and commits:** follow [`git-workflow.md`](../../context/git-workflow.md). Use
  a `chore/setup-<slug>` branch per piece of work, and commit `Docs/setup-status.md` with
  the change that moved its rows.
- When every item an agent can do is `done`, `opted out`, or `n/a`, say so, and list what
  still waits on the user.

## Notes

- **The status file is a record, not the truth.** The repo is. That is why every run
  rechecks `done` rows instead of trusting them.
- **Non-negotiable rules still apply during setup.** In particular, never mark
  `tokens-alpha-guard` or `stack-dev-guard` done on the strength of a guard that was
  weakened to pass (`AGENTS.md`, rules 5 and 6).
- **Adding to the checklist:** see "Changing this checklist" at the end of
  [`checklist.md`](checklist.md). A new placeholder in the template gets a stub row in the
  same change.
