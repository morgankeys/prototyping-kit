# Git workflow

How a track of work becomes commits and a pull request. Read this before creating a branch or committing.

Each track stays recognizable in its branch, its commits, and its pull request.

A new thread starts a new branch. Stay on the current branch only when the user says to keep working on it.

If the repo is already dirty — staged changes, unstaged changes, or untracked files this chat did not create — ask what to do before branching, committing, or switching. Leave that work untouched until the user answers.

## Creating a branch

Default: cut the branch from an up-to-date `main`. Use another base only when the user specifies one. Open the pull request back into that same base.

```bash
git fetch origin
git switch main && git pull --ff-only
git switch -c <type>/<slug>
```

- New thread, clean tree, and the user did not say to stay: create the branch and do the work there.
- The user said to keep working on the current branch: stay on it.
- The repo is already dirty: ask what to do. Leave the existing work untouched until the user answers.
- Never commit directly to `main` or `staging` unless this chat was told to work on that branch.

Read-only chats do not need a branch.

Branch names are `<type>/<slug>`, lowercase and hyphenated.

| Type     | For                                                   |
| -------- | ----------------------------------------------------- |
| `feat`   | New pages, components, or capabilities                |
| `fix`    | Bug fixes and layout/style corrections                |
| `docs`   | `Docs/`, `Agents/`, and README changes                |
| `chore`  | Dependencies, config, tooling, housekeeping           |
| `tokens` | Token pipeline changes and token-export regenerations |

### When the user specifies staging

Use `staging` only when the user says to. It is `main` plus commits that have not been promoted yet. Everything on `main` is already on `staging`, apart from the promotion merge commit itself. Do not put any other commit on `main`, and do not rewrite `staging`. Once those two drift, later promotions conflict.

The person who owns the work runs the merges:

1. When a feature branch is ready, open a pull request into `staging` and **squash-merge** it.
2. To promote, open a pull request from `staging` into `main` and merge it with **Create a merge commit**.
3. Never squash-merge `staging` into `main`. A squash rewrites `staging`'s commits into new ones on `main`, the branches stop sharing history, and the next promotion conflicts.

Rulesets that lock this in are in [`Docs/github.md`](../../Docs/github.md).

## Committing and pushing

Once it is clear which branch this chat is on — a new branch, or the current one because the user said to stay — commit and push without a separate ask.

If the repo is already dirty with work this chat did not create, ask what to do and leave that work untouched. Never commit or push directly on `main` or `staging` unless this chat was told to work on that branch.

Use `git push -u origin HEAD` the first time, then `git push` after later commits. Do not force-push.

Opening a pull request is separate. Do not run `gh pr create` or any other command that opens a pull request unless the user asks in that turn. Invoking `/pr` is that ask — follow [`Agents/skills/pr/SKILL.md`](../skills/pr/SKILL.md). Without `/pr`, report the branch name and the commits so the user can open the pull request.

## Commit style

One logical change per commit. A token regeneration and an unrelated component tweak are two commits.

Subject line: imperative mood, 72 characters max, no trailing period. Add a body only when the "why" is not obvious, as a few short bullets.

```
Add tone overlays to project cards

- Overlay color comes from the new tone token set
- Cards fall back to the neutral surface when no tone is set
```

Do not write session-summary subjects: one commit describes one change, not everything a chat did.

## Two chats editing at once

Use a worktree when two chats must edit this repo at the same time. One checkout has one branch, so those chats would otherwise overwrite each other's files and the dev server.

```bash
git fetch origin
git worktree add ../<repo>-<slug> -b <type>/<slug> origin/main
cd ../<repo>-<slug>/Code
# install dependencies, then run `dev` on the next free port
```

Dependency folders are not shared between worktrees; install them in each one. The main checkout owns `<dev port>`; the next worktree uses `<dev port> + 1`, then `+ 2`. `Code/README.md` says how to pass a port to `dev`.

After the branch is merged:

```bash
git worktree remove ../<repo>-<slug>
git branch -d <type>/<slug>
```

## Rules of thumb

- Rebase onto `main`, or onto the base the user specified. Do not merge that base into a feature branch.
- Never commit generated output: build output and dependency folders belong in [`.gitignore`](../../.gitignore). If generated files show up in `git status`, fix the ignore rules.
  Exception: unpacked Figma token JSON under `Docs/Design system/Figma/Tokens/` is tracked on purpose, even though the `tokens` command regenerates it, so token diffs are reviewable in pull requests.
