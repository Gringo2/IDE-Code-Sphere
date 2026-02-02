#!/usr/bin/env bash

# dev/build_test.sh
# description: Wrapper for build.sh that skips asset generation for faster testing

echo "Starting TEST BUILD (Skipping assets and source reset)..."

# Set flags for quicker build
export SKIP_ASSETS="yes"
export SKIP_SOURCE="yes"  # Assumes source is checked out
export CI_BUILD="no"

# Ensure we have source if skipping
if [[ ! -d "vscode" ]]; then
  echo "vscode directory missing, fetching source..."
  export SKIP_SOURCE="no"
fi

./dev/build.sh "$@"
