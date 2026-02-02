#!/usr/bin/env bash

# dev/apply_patch.sh
# description: Helper to apply a single patch using CodeSphere logic

if [[ -z "$1" ]]; then
  echo "Usage: ./dev/apply_patch.sh <path-to-patch>"
  exit 1
fi

PATCH_FILE="$1"

if [[ ! -f "$PATCH_FILE" ]]; then
  echo "Error: Patch file '$PATCH_FILE' not found."
  exit 1
fi

source ./utils.sh

echo "Applying patch: $PATCH_FILE"
apply_patch "$PATCH_FILE"
