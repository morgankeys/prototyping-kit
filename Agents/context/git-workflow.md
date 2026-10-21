# Git workflow

How a track of work becomes commits and a pull request. Read this before creating a branch or committing.

Each track stays recognizable in its branch, its commits, and its pull request. Stay on the current branch when this chat belongs to that track. When the checkout has another conversation's changes, or this chat is a different track, ask before mixing them.

## Creating a branch

- This chat continues the branch already checked out: stay on it.
- `HEAD` is the integration branch (or the production branch, if they differ): create a feature branch from the integration branch before committing. Uncommitted work from this chat comes along with `git switch -c`.
- Another conversation's changes are in the checkout, or this chat is a different track: ask first. Separate with a new branch, separate commits, or by leaving the other work untouched.

Read-only chats do not need a branch. Never commit directly to the integration branch or the production branch.

### Base branch: the integration branch

Every track branches from an up-to-date **integration branch** and opens its pull request back into it. The preferred integration branch is `staging` (see [Preferred: staging in front of main](#preferred-staging-in-front-of-main)). A project that has not adopted `staging` uses `main` as the integration branch. Use the project's integration branch everywhere this doc says `<integration branch>`.

New work goes on a feature branch unless this chat was explicitly told to work on `main` or `staging`.

```bash
git fetch origin
git switch <integration branch> && git pull --ff-only
git switch -c feat/<slug>
```

Branch names are `<type>/<slug>`, lowercase and hyphenated.

| Type     | For                                                   |
| -------- | ----------------------------------------------------- |
| `feat`   | New pages, components, or capabilities                |
| `fix`    | Bug fixes and layout/style corrections                |
| `docs`   | `Docs/`, `Agents/`, and README changes                |
| `chore`  | Dependencies, config, tooling, housekeeping           |
| `tokens` | Token pipeline changes and token-export regenerations |

### Preferred: staging in front of main

`staging` is `main` plus commits that have not been promoted yet. Everything on `main` is already on `staging`, apart from the promotion merge commit itself. Do not put any other commit on `main`, and do not rewrite `staging`. Once those two drift, later promotions conflict.

The person who owns the work runs the merges:

1. When a feature branch is ready, open a pull request into `staging` and **squash-merge** it.
2. To promote, open a pull request from `staging` into `main` and merge it with **Create a merge commit**.
3. Never squash-merge `staging` into `main`. A squash rewrites `staging`'s commits into new ones on `main`, the branches stop sharing history, and the next promotion conflicts.

Feature work never branches from or merges into `main` directly. Only that promotion pull request targets `main`. Rulesets that lock this in are in [`Docs/github.md`](../../Docs/github.md). Agents push the feature branch; they open the pull request only when asked (`/pr`), and that pull request targets `staging`.

## Commit style

One logical change per commit. A token regeneration and an unrelated component tweak are two commits.

Subject line: imperative mood, 72 characters max, no trailing period. Add a body only when the "why" is not obvious, as a few short bullets.

```
Add tone overlays to project cards

- Overlay color comes from the new tone token set
- Cards fall back to the neutral surface when no tone is set
```

Do not write session-summary subjects: one commit describes one change, not everything a chat did.

## Push the branch

Push a feature branch whenever its commits are ready. A new branch — anything other than `main` or `staging` — does not need a separate ask. Use `git push -u origin HEAD` the first time, then `git push` after later commits. Do not force-push.

Opening a pull request is separate. Do not run `gh pr create` or any other command that opens a pull request unless the user asks in that turn. Invoking `/pr` is that ask — follow [`Agents/skills/pr/SKILL.md`](../skills/pr/SKILL.md). Without `/pr`, report the branch name and the commits so the user can open the pull request.

If this chat was told to work on `main` or `staging` themselves, ask before pushing. Those branches are shared; a feature branch cut from either of them is fine to push.

## Two chats editing at once

Use a worktree when two chats must edit this repo at the same time. One checkout has one branch, so those chats would otherwise overwrite each other's files and the dev server.

```bash
git fetch origin
git worktree add ../<repo>-<slug> -b <type>/<slug> origin/<integration branch>
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

- Rebase onto the integration branch. Do not merge the integration branch into a feature branch.
- Never commit generated output: build output and dependency folders belong in [`.gitignore`](../../.gitignore). If generated files show up in `git status`, fix the ignore rules.
  Exception: unpacked Figma token JSON under `Docs/Design system/Figma/Tokens/` is tracked on purpose, even though the `tokens` command regenerates it, so token diffs are reviewable in pull requests.
