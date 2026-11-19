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

**Read [`guiding-users.md`](../../context/guiding-users.md) before you start.** Setup is
often a user's first hour with the kit, and many users have not set up a codebase before.
The checklist is written for agents: its ids, levels, and role names are your working
notes, not what you say to the user. Your job is to lead them through it.

Safe to rerun at any point in a project. A run with nothing to do just reports that.

| Invocation | Does |
| --- | --- |
| `/setup` | Check everything, say where things stand, then guide the user through the next step. |
| `/setup status` | Check and show the full breakdown only. Change nothing but the status file. |
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
  `./new-kit.sh`, then `/setup` in the new kit.
- *A kit copied by hand:* do `kit-provenance` first. Add the provenance line to
  `README.md`, then delete `new-kit.sh`, `.github/workflows/template.yml`, and every
  `template-only` block, as
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
  lists as open under a `done` item usually means this; the checklist's "Stubs" section
  names the three markers that are shared between items.
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

Write for the user in front of you, following
[`guiding-users.md`](../../context/guiding-users.md). The default is short and guided:

1. **Where things stand**, in a sentence or two of plain words: what is working already
   and roughly how much is left. On a first run, also say in one or two sentences what
   setup will involve and that you will do the technical parts.
2. **Anything that broke** since the last run (rows that were `done` and no longer are),
   and that you will fix it.
3. **What you need from them**, if anything is theirs to do right now: the first such
   step only, with what it is for and exactly how to do it. Mention how many more of
   their steps follow, not what they are.
4. **What you will do next** yourself, described by what it gives them.
5. **One clear next move**, then wait: either their step, or "shall I go ahead?"

Offer the full breakdown; show it when the user asks, with `/setup status`, or when they
have shown they are comfortable with the detail. It lists, leaving out empty groups:
their steps, steps ready for an agent, steps waiting and what unblocks them, optional
tools not yet decided, content still stubbed (as counts, such as "7 of 10 guideline files
are placeholders"), and what was skipped. Describe each item in plain words and put its id
in backticks after it. With `/setup status`, stop after the breakdown.

### 5. Opt-outs

The user can skip any `default` or `optional` item, a whole group ("no Figma tools"), or a
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

Work in checklist order, one item at a time, and re-run the scan after each. Before each
one, say in a sentence what it is for; after it, say what changed.

- **Their steps (`user`):** give one action with exact directions, then wait. When they
  say it is done, verify what can be verified before marking it. If it didn't work, say
  what you see and what to try, without blame.
- **Your steps (`agent`):** say what you are about to set up and what it gives them, then
  do it by following the skill or doc the checklist row links to. Don't restate or
  improvise its procedure, and don't ask the user to run commands for you. Tokens go
  through [`design-tokens`](../design-tokens/SKILL.md); the workbench and Code Connect go
  through [`/component-catalog`](../component-catalog/SKILL.md).
- **Shared steps (`both`):** these need a decision. Ask about what the user knows (what
  they are building, who will see it, whether developers will take it over), recommend
  one option with a one-line reason, and proceed with it unless they object. For
  `stack-choice` in particular, never open with a list of frameworks.
- **Default tools:** don't ask about each one. Before the first install, list the default
  set in a few plain lines (what each is for), say any of them can be skipped now or
  later, and ask once whether to go ahead with all of them.
- **Optional tools:** offer each once, with what it adds and what skipping costs.
- **Required items:** set them up without asking the user to decide, and say in a
  sentence what each guards against.
- **Tools in general:** before installing one, read its entry in
  [`Docs/Tooling.md`](../../../Docs/Tooling.md) for where to get it and its gotchas. Pin
  the version. If the user would rather use a different tool for the same job, use it and
  record it in `Code/ARCHITECTURE.md`.
- **Secrets:** when a step needs a token (publishing Code Connect), tell the user which
  file it goes in. Never ask them to paste it into the chat.
- **Branches and commits:** follow [`git-workflow.md`](../../context/git-workflow.md). Use
  the branch the linked skill names (`tokens/<slug>` for the token pipeline,
  `chore/component-catalog` for the catalog), otherwise a `chore/setup-<slug>` branch per
  piece of work, and commit `Docs/setup-status.md` with
  the change that moved its rows. Mention once that work is saved in steps and can be
  undone; don't narrate git after that.
- **When a check finds problems** while you work: fix technical ones yourself; raise
  design ones with the user. The split is in the operating notes in `AGENTS.md`. Never
  skip a check or switch it off to get past it.
- **Pace:** setup doesn't have to finish in one sitting. At a natural stopping point, say
  what is working now and that `/setup` picks up where it left off.
- When every item an agent can do is `done`, `opted out`, or `n/a`, say so, say what the
  user can do with the kit now, and list what still waits on them.

## Notes

- **The status file is a record, not the truth.** The repo is. That is why every run
  rechecks `done` rows instead of trusting them.
- **Non-negotiable rules still apply during setup.** In particular, never mark
  `tokens-alpha-guard` or `stack-dev-guard` done on the strength of a guard that was
  weakened to pass (`AGENTS.md`, rules 5 and 6).
- **Adding to the checklist:** see "Changing this checklist" at the end of
  [`checklist.md`](checklist.md). A new placeholder in the template gets a stub row in the
  same change.
