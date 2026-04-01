#!/usr/bin/env bash
# Check whether unstaged .js files differ from HEAD only by reformatting.
# For each file, extract the HEAD version next to the real file with a
# .head-check.js suffix, run biome on it, then compare to the working tree.

set -euo pipefail

cleanup_files=()
cleanup() {
  for f in "${cleanup_files[@]}"; do
    rm -f "$f"
  done
}
trap cleanup EXIT

# Get unstaged modified .js files
files=$(git diff --name-only -- '*.js' 'modules/*.js')

if [ -z "$files" ]; then
  echo "No unstaged modified .js files."
  exit 0
fi

# Extract HEAD versions alongside originals with a temporary name
for f in $files; do
  tmp="${f%.js}.head-check.js"
  git show "HEAD:$f" > "$tmp"
  cleanup_files+=("$tmp")
done

# Format them all at once with biome
npx @biomejs/biome check --write "${cleanup_files[@]}" >/dev/null 2>&1 || true

fmt_only=()
substantive=()

for f in $files; do
  tmp="${f%.js}.head-check.js"
  if diff -q "$tmp" "$f" >/dev/null 2>&1; then
    fmt_only+=("$f")
  else
    substantive+=("$f")
  fi
done

if [ ${#fmt_only[@]} -gt 0 ]; then
  echo "Format-only changes (safe to discard):"
  for f in "${fmt_only[@]}"; do
    echo "  $f"
  done
fi

if [ ${#substantive[@]} -gt 0 ]; then
  echo ""
  echo "SUBSTANTIVE changes (not just formatting):"
  for f in "${substantive[@]}"; do
    echo "  $f"
    tmp="${f%.js}.head-check.js"
    diff --unified=3 "$tmp" "$f" | head -40
    echo "  ..."
    echo ""
  done
fi

echo ""
echo "Summary: ${#fmt_only[@]} format-only, ${#substantive[@]} substantive"
