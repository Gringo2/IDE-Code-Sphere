#!/usr/bin/env bash

# dev/verify_build.sh
# description: Verifies that build artifacts were created successfully

echo "Verifying build artifacts..."

FAILURE=0

# Check for VS Code binary
if [[ -f "vscode/.build/electron/CodeSphere" ]] || [[ -f "vscode/.build/electron/CodeSphere.exe" ]]; then
  echo "✅ Core binary found"
else
  echo "❌ Core binary MISSING"
  FAILURE=1
fi

# Check for CLI binary
if [[ -f "vscode/cli/target/release/code" ]] || [[ -f "vscode/cli/target/release/code.exe" ]]; then
  echo "✅ CLI binary found"
else
  echo "⚠️ CLI binary MISSING (Non-fatal)"
fi

# Check for assets (if any)
if compgen -G "assets/*" > /dev/null; then
  echo "✅ Assets found in assets/"
else
  echo "⚠️ No packaged assets found"
fi

# Check for branding
if strings "vscode/.build/electron/CodeSphere" 2>/dev/null | grep -q "CodeSphere"; then
  echo "✅ Binary contains branding string"
else
  echo "⚠️ Could not verify branding in binary (strings command failed or binary format not supported)"
fi

if [[ $FAILURE -eq 0 ]]; then
  echo "Build verification PASSED."
  exit 0
else
  echo "Build verification FAILED."
  exit 1
fi
