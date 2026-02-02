#!/usr/bin/env bash

# dev/reset_src.sh
# description: Resets the vscode/ directory to a clean state

if [[ ! -d "vscode" ]]; then
  echo "Error: vscode directory not found."
  exit 1
fi

echo "Resetting vscode/ directory..."
cd vscode || exit 1

# Reset to HEAD
git reset --hard HEAD

# Clean untracked files
git clean -fd

echo "vscode directory reset complete."
