# Managing the repo

Notes for the people who own a project built on this kit: how branches flow, which repo
settings matter, and routine upkeep.

Related: [`Agents/context/git-workflow.md`](../Agents/context/git-workflow.md) holds the
rules agents follow for branches, commits, and pull requests. The same conventions suit
people too.

## Branch model

Preferred layout. A project that has not created `staging` uses `main` as the integration branch until it does.

| Branch          | Role                                                          |
| --------------- | ------------------------------------------------------------- |
| `main`          | Production                                                    |
| `staging`       | Integration. `main`, plus commits not promoted yet            |
| `<type>/<slug>` | One track of work, e.g. `fix/contact-link`                    |
| `claude/<name>` | Branches that Claude Code sessions name automatically         |

`staging` mirrors `main` aside from those unpromoted commits. The promotion merge commit lands on `main` only. Do not add any other commit directly to `main`, and do not rewrite `staging`.

New work goes on a feature branch unless someone explicitly says to work on `main` or `staging`.

1. When the feature branch is ready, open a pull request into `staging` and **squash-merge** it.
2. To promote, open a pull request from `staging` into `main` and merge with **Create a merge commit**.
3. Never squash-merge `staging` into `main`. A squash gives `main` new commit hashes, the branches stop sharing history, and the next promotion conflicts.

Feature work never targets `main` while `staging` exists. Only the promotion pull request does.

## Promoting to production

1. Check the `staging` build looks right.
2. Open a pull request from `staging` into `main`. CI runs on it.
3. Merge it with **Create a merge commit**. Never squash or rebase that pull request.

Promote often. Small promotions are easy to review and easy to roll back.

## What CI checks

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pull requests into
`staging` and `main`: `lint`, `check`, `build`, `validate`, then `git diff --exit-code` to
fail the run if build or validation changed a tracked file. Validation prints deviations
as a warning and exits 0; a stale committed backlog is what fails the job. `--strict` is
local-only. Fill in the real commands from [`Code/README.md`](../Code/README.md).

## Recommended settings

GitHub doesn't expose most of these to agent sessions, which also cannot see rulesets, so
check them yourself in the repo's **Settings**.

| Setting                            | Where                         | Recommended                                                         | Why                                                                 |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Automatically delete head branches | General > Pull Requests       | On                                                                  | Feature branches disappear when their PR merges                    |
| Allow merge commits                | General > Pull Requests       | On                                                                  | `staging` → `main` uses a merge commit                              |
| Allow squash merging               | General > Pull Requests       | On                                                                  | Feature branches squash into `staging`                              |
| Allow rebase merging               | General > Pull Requests       | Off                                                                 | Rebase rewrites the commits a promotion needs to share              |

### Rulesets

Add two rulesets under **Settings > Rules > Rulesets**. GitHub's allowed merge methods are repository-wide, so a ruleset cannot require squash on `staging` and a merge commit on `main` at the same time. The rulesets below lock everything else; the person merging still picks squash for a feature pull request and **Create a merge commit** for a promotion.

**`protect-main`**, target branch `main`:

- Restrict updates to pull requests. Block direct pushes.
- Block force pushes and deletion.
- Require a pull request before merging.
- Require the `verify` status check.

**`protect-staging`**, target branch `staging`:

- Restrict updates to pull requests. Block direct pushes.
- Block force pushes and deletion, so `staging` cannot be rewritten out from under `main`.
- Require a pull request before merging.
- Require the `verify` status check.

Feature branches stay unprotected so agents can push them.

## Branch cleanup

A merged feature branch's work already lives on `staging`, so deleting the branch loses
nothing. To list and delete every fully merged remote branch:

```bash
git fetch --prune origin
git branch -r --merged origin/staging | grep -vE 'origin/(main|staging|HEAD)' \
  | sed 's#origin/##' | xargs git push origin --delete
```

Branches the command skips are unmerged. Check them before deleting. With **Automatically
delete head branches** on, this is rarely needed.

## Working with agents

- **Agents push feature branches; people merge them.** An agent pushes a new branch when
  its commits are ready, and asks first when the work is on `main` or `staging`. An agent
  opens a PR only when asked (the `/pr` skill). Merging and promoting are always done by a
  person.
- **Agent sessions can't delete branches.** Claude Code cloud sessions can push branches
  but get a 403 when deleting one, so branch cleanup is a person's job.
- **Agent rules live in the repo.** `AGENTS.md` is the entry point, and changes to how
  agents work go through pull requests like any other change.
