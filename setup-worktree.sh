#!/usr/bin/env bash

# Copy untracked files needed for running/testing app.js into a worktree.
# Usage: ./setup-worktree.sh <worktree-path>

set -euo pipefail

MAIN_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <worktree-path>" >&2
  exit 1
fi

WORKTREE="$1"

if [[ ! -d "$WORKTREE" ]]; then
  echo "Error: $WORKTREE is not a directory" >&2
  exit 1
fi

# SQLite database
if [[ -f "$WORKTREE/db.db" ]]; then
  echo "Skipping db.db (already exists in worktree)"
elif [[ -f "$MAIN_DIR/db.db" ]]; then
  sqlite3 "$MAIN_DIR/db.db" "VACUUM INTO '$WORKTREE/db.db';"
  echo "Copied db.db (via VACUUM INTO)"
else
  echo "Warning: db.db not found in $MAIN_DIR" >&2
fi

# Environment variables (API key, server URL, repos path)
if [[ -f "$WORKTREE/.env" ]]; then
  echo "Skipping .env (already exists in worktree)"
elif [[ -f "$MAIN_DIR/.env" ]]; then
  cp "$MAIN_DIR/.env" "$WORKTREE/.env"
  echo "Copied .env"
else
  echo "Warning: .env not found in $MAIN_DIR" >&2
fi

# Install node_modules if not already present
if [[ ! -d "$WORKTREE/node_modules" ]]; then
  echo "Running npm install in worktree..."
  (cd "$WORKTREE" && npm install --silent)
  echo "Installed node_modules"
else
  echo "node_modules already exists, skipping npm install"
fi

echo "Done. Worktree at $WORKTREE is ready to run app.js."
