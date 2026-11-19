#!/usr/bin/env bash
# Runs ./new-prototype.sh non-interactively into a temp folder and checks the prototype it makes:
# template-only material gone, everything else copied, provenance recorded, fresh history.
#   bash .github/template-checks/new-prototype.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "new-prototype.sh test: commit or stash changes first (new-prototype.sh copies HEAD only)." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NAME="prototype-ci-test"
export GIT_AUTHOR_NAME="Template CI" GIT_AUTHOR_EMAIL="ci@example.invalid"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

# Answers: prototype name, parent folder, then "no" to creating a GitHub repo.
printf '%s\n%s\nn\n' "$NAME" "$TMP" | ./new-prototype.sh >/dev/null
PROTO="$TMP/$NAME"

problems=()
fail() { problems+=("$1"); }

[[ -d "$PROTO" ]] || { echo "new-prototype.sh test: no prototype was created at $PROTO" >&2; exit 1; }
for gone in new-prototype.sh .github/workflows/template.yml .github/template-checks; do
  [[ ! -e "$PROTO/$gone" ]] || fail "the prototype still has $gone"
done
if grep -rlF --include='*.md' --include='*.mdc' 'template-only:' "$PROTO" >/dev/null; then
  fail "the prototype still has template-only blocks: $(grep -rlF --include='*.md' --include='*.mdc' 'template-only:' "$PROTO" | sed "s#$PROTO/##" | tr '\n' ' ')"
fi
[[ "$(head -1 "$PROTO/README.md")" == "# $NAME" ]] || fail "README.md is not titled '# $NAME'"
grep -q '^Created from prototyping-kit @ `[0-9a-f]\+` on `[0-9-]\+`\.$' "$PROTO/README.md" || fail "README.md has no provenance line"
[[ "$(git -C "$PROTO" rev-list --count HEAD)" == "1" ]] || fail "the prototype does not start with exactly one commit"
git -C "$PROTO" remote get-url template >/dev/null 2>&1 || fail "the prototype has no 'template' remote"

# Everything else the template tracks is in the prototype.
while IFS= read -r f; do
  case "$f" in new-prototype.sh|.github/workflows/template.yml|.github/template-checks/*) continue ;; esac
  [[ -e "$PROTO/$f" ]] || fail "the prototype is missing $f"
done < <(git ls-files)

# The prototype's own setup scan sees a prototype, not the template.
if node "$PROTO/Agents/skills/setup/scripts/setup-scan.mjs" | grep -q "Repo: TEMPLATE"; then
  fail "setup-scan.mjs still thinks the prototype is the template"
fi

if ((${#problems[@]})); then
  echo "new-prototype.sh test: ${#problems[@]} problem(s)"
  printf '  - %s\n' "${problems[@]}"
  exit 1
fi
echo "new-prototype.sh test: ok"
