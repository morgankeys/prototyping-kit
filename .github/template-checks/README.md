# Template checks

The template's own CI checks, run by [`../workflows/template.yml`](../workflows/template.yml)
on every pull request. Template only: `new-prototype.sh` deletes this folder and that workflow
from every new prototype, and `/setup` deletes them from a prototype copied by hand. Node 22 or later,
nothing to install. Run any of them from the repo root.

| Check | Fails when |
| --- | --- |
| `setup-not-started.mjs` | Someone has started setting up a prototype in the template: a status file, project files in `Code/`, Figma exports, a filled-in placeholder, or a provenance line. Its message says how to fix it. |
| `setup-scan.test.mjs` | `/setup`'s scan script no longer reads the checklist as written. |
| `docs-agree.mjs` | Files that describe the same thing drift apart: skill stubs, the `AGENTS.md` routing table and `Agents/README.md` against the skills; the validator contract against the reference validator; the setup checklist's ids and dependencies; `ci.yml`'s roles against `Code/README.md`. |
| `links.mjs` | A relative link or `#anchor` in any tracked Markdown file points at nothing. |
| `new-prototype.test.sh` | `./new-prototype.sh` makes a prototype that keeps template-only material, loses a file, or lacks its provenance line, fresh history, or `template` remote. Needs a clean working tree. |

`docs-agree.mjs` checks structure only. Whether two files say the same thing in words
still needs a review; [`Agents/prompts/review-drift.md`](../../Agents/prompts/review-drift.md)
is the prompt for that.

When you add a check, add a row here and a step in the workflow.
