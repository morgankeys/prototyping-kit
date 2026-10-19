#!/usr/bin/env bash
#
# new-kit.sh — duplicate this template into a fresh, standalone prototyping kit.
#
# TEMPLATE-ONLY: this script, and every block wrapped in
#   <!-- template-only:start --> ... <!-- template-only:end -->
# in the kit's Markdown files, is left out of the new kit. The new kit becomes a specific
# kit for one prototype, so it does not carry the means to stamp out more kits.
#
# What it does:
#   1. Asks for the new kit's name and where to put it (default: next to this template).
#   2. Copies the template's committed files (HEAD), minus this script and the
#      template-only blocks. Uncommitted changes and untracked files are not copied.
#      Retitles the README with the new name and adds the provenance line.
#   3. Starts a fresh git history with one commit, and adds a `template` remote pointing
#      back here so kit updates can be pulled in later.
#   4. Optionally creates a GitHub repo with `gh` and pushes to it.
#
# Usage: ./new-kit.sh

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
TEMPLATE_DIR="$(cd "$(dirname "$0")" && pwd)"
START_MARK='<!-- template-only:start -->'
END_MARK='<!-- template-only:end -->'

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }

# ask "Prompt" "default" -> echoes the answer (or the default when left blank)
ask() {
  local answer
  if [[ -n "${2:-}" ]]; then
    read -r -p "$1 [$2]: " answer || true
    printf '%s' "${answer:-$2}"
  else
    read -r -p "$1: " answer || true
    printf '%s' "$answer"
  fi
}

# confirm "Prompt" -> succeeds on y/yes (default no)
confirm() {
  local answer
  read -r -p "$1 [y/N]: " answer || true
  [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]]
}

git -C "$TEMPLATE_DIR" rev-parse --verify -q HEAD >/dev/null \
  || die "the template has no commits yet; commit it first."

# --- Gather input ----------------------------------------------------------------------

NAME="$(ask "New kit name (used for the folder and repo, e.g. prototyping-kit-example-acme)")"
[[ -n "$NAME" ]] || die "a name is required."
[[ "$NAME" =~ ^[A-Za-z0-9._-]+$ ]] \
  || die "use only letters, numbers, dots, dashes, and underscores in the name."

PARENT_DIR="$(ask "Create it in" "$(dirname "$TEMPLATE_DIR")")"
PARENT_DIR="${PARENT_DIR/#\~/$HOME}"
[[ -d "$PARENT_DIR" ]] || die "folder does not exist: $PARENT_DIR"
DEST="$(cd "$PARENT_DIR" && pwd)/$NAME"
[[ ! -e "$DEST" ]] || die "already exists: $DEST"

if [[ -n "$(git -C "$TEMPLATE_DIR" status --porcelain --untracked-files=no)" ]]; then
  echo "Note: the template has uncommitted changes. Only committed files (HEAD) are copied."
  confirm "Continue anyway?" || exit 1
fi

# --- Copy ------------------------------------------------------------------------------

TEMPLATE_SHA="$(git -C "$TEMPLATE_DIR" rev-parse --short HEAD)"
TEMPLATE_URL="$(git -C "$TEMPLATE_DIR" remote get-url origin 2>/dev/null || echo "$TEMPLATE_DIR")"

mkdir -p "$DEST"
git -C "$TEMPLATE_DIR" archive HEAD | tar -x -C "$DEST"
cd "$DEST"

# Drop template-only material.
rm -f "$SCRIPT_NAME"
grep -rlF --include='*.md' --include='*.mdc' "$START_MARK" . 2>/dev/null | while read -r file; do
  sed "\#$START_MARK#,\#$END_MARK#d" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Title the README after the new kit and record provenance
# (see Agents/context/kit-structure.md#kit-provenance).
PROVENANCE="Forked from prototyping-kit @ \`$TEMPLATE_SHA\` on \`$(date +%Y-%m-%d)\`."
awk -v name="$NAME" -v line="$PROVENANCE" '
  NR == 1 && /^# / { print "# " name; print ""; print line; next }
  NR == 1          { print "# " name; print ""; print line; print "" }
  { print }
' README.md > README.md.tmp && mv README.md.tmp README.md

# --- Fresh history ---------------------------------------------------------------------

git init -q -b main
git add -A
git commit -q -m "Initialize from prototyping-kit template ($TEMPLATE_SHA)"
git remote add template "$TEMPLATE_URL"
echo "Created $DEST"

# --- Optional GitHub repo --------------------------------------------------------------

if command -v gh >/dev/null 2>&1 && confirm "Create a GitHub repo and push?"; then
  OWNER="$(ask "GitHub owner" "$(gh api user --jq .login 2>/dev/null || true)")"
  [[ -n "$OWNER" ]] || die "a GitHub owner is required."
  if confirm "Make it public? (default private)"; then VISIBILITY=--public; else VISIBILITY=--private; fi

  gh repo create "$OWNER/$NAME" "$VISIBILITY"
  git remote add origin "https://github.com/$OWNER/$NAME.git"
  git push -u origin main
  echo "Pushed to https://github.com/$OWNER/$NAME"
fi

echo "Done. Next: cd \"$DEST\""
