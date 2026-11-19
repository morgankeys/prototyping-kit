#!/usr/bin/env bash
# Runs ./new-kit.sh non-interactively into a temp folder and checks the kit it makes:
# template-only material gone, everything else copied, provenance recorded, fresh history.
#   bash .github/template-checks/new-kit.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "new-kit.sh test: commit or stash changes first (new-kit.sh copies HEAD only)." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NAME="kit-ci-test"
export GIT_AUTHOR_NAME="Template CI" GIT_AUTHOR_EMAIL="ci@example.invalid"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

# Answers: kit name, parent folder, then "no" to creating a GitHub repo.
printf '%s\n%s\nn\n' "$NAME" "$TMP" | ./new-kit.sh >/dev/null
KIT="$TMP/$NAME"

problems=()
fail() { problems+=("$1"); }

[[ -d "$KIT" ]] || { echo "new-kit.sh test: no kit was created at $KIT" >&2; exit 1; }
for gone in new-kit.sh .github/workflows/template.yml .github/template-checks; do
  [[ ! -e "$KIT/$gone" ]] || fail "the kit still has $gone"
done
if grep -rlF --include='*.md' --include='*.mdc' 'template-only:' "$KIT" >/dev/null; then
  fail "the kit still has template-only blocks: $(grep -rlF --include='*.md' --include='*.mdc' 'template-only:' "$KIT" | sed "s#$KIT/##" | tr '\n' ' ')"
fi
[[ "$(head -1 "$KIT/README.md")" == "# $NAME" ]] || fail "README.md is not titled '# $NAME'"
grep -q '^Created from prototyping-kit @ `[0-9a-f]\+` on `[0-9-]\+`\.$' "$KIT/README.md" || fail "README.md has no provenance line"
[[ "$(git -C "$KIT" rev-list --count HEAD)" == "1" ]] || fail "the kit does not start with exactly one commit"
git -C "$KIT" remote get-url template >/dev/null 2>&1 || fail "the kit has no 'template' remote"

# Everything else the template tracks is in the kit.
while IFS= read -r f; do
  case "$f" in new-kit.sh|.github/workflows/template.yml|.github/template-checks/*) continue ;; esac
  [[ -e "$KIT/$f" ]] || fail "the kit is missing $f"
done < <(git ls-files)

# The kit's own setup scan sees a kit, not the template.
if node "$KIT/Agents/skills/setup/scripts/setup-scan.mjs" | grep -q "Repo: TEMPLATE"; then
  fail "setup-scan.mjs still thinks the kit is the template"
fi

if ((${#problems[@]})); then
  echo "new-kit.sh test: ${#problems[@]} problem(s)"
  printf '  - %s\n' "${problems[@]}"
  exit 1
fi
echo "new-kit.sh test: ok"
