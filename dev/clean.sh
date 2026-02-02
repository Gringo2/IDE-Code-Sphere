#!/usr/bin/env bash

# dev/clean.sh
# description: Cleans build artifacts and temporary files

echo "Cleaning build artifacts..."

# Remove VS Code build output
if [[ -d "vscode" ]]; then
  echo "Cleaning vscode/.build..."
  rm -rf vscode/.build
  echo "Cleaning vscode/out..."
  rm -rf vscode/out
  echo "Cleaning vscode/out-build..."
  rm -rf vscode/out-build
fi

# Remove root build directory
if [[ -d "build/windows/msi/releasedir" ]]; then
  echo "Cleaning MSI release dir..."
  rm -rf build/windows/msi/releasedir
fi

# Remove assets
echo "Cleaning assets..."
rm -rf assets/*

# Remove npm logs
rm -f npm-debug.log*

echo "Clean complete."
