# Patch System

The CodeSphere IDE patch system allows applying custom modifications to the VS Code source while maintaining the ability to update from upstream.

## Overview

### Why Patches?

CodeSphere needs to make specific modifications to VS Code that go beyond simple text replacement:

- **Functional Changes**: Altering behavior (telemetry removal, marketplace switching)
- **UI Modifications**: Custom branding, menu items, dialogs
- **Build Configuration**: Platform-specific build tweaks
- **Bug Fixes**: CodeSphere-specific fixes not in upstream

### Patch Strategy

Instead of forking VS Code and maintaining a divergent codebase, CodeSphere:

1. Clones vanilla VS Code
2. Applies a series of **atomic patches**
3. Each patch addresses one specific change
4. Patches can be updated independently

## Patch Directory Structure

```
patches/
├── 0001-disable-telemetry.patch
├── 0002-openvsx-marketplace.patch
├── 0003-remove-crash-reporter.patch
├── 0004-custom-welcome-page.patch
...
├── 0061-product-json-branding.patch
└── README.md
```

**Total**: 61 patches (as of latest count)

## Patch Format

Patches are **Git-style unified diffs**:

```diff
From abc123 CodeSphere: Disable telemetry

---
 src/vs/platform/telemetry/common/telemetry.ts | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

diff --git a/src/vs/platform/telemetry/common/telemetry.ts b/src/vs/platform/telemetry/common/telemetry.ts
index abc123..def456 100644
--- a/src/vs/platform/telemetry/common/telemetry.ts
+++ b/src/vs/platform/telemetry/common/telemetry.ts
@@ -10,7 +10,7 @@ export class TelemetryService {
-    this.enabled = true;
+    this.enabled = false;
```

## Creating a New Patch

### Method 1: Semi-Automated (`dev/patch.sh`)

**Recommended** for most changes.

#### Steps:

1. **Initialize patch creation**:
```bash
./dev/patch.sh my-feature-name
```

The script will:
- Clone fresh VS Code source
- Apply all *existing* patches
- Pause for your changes

2. **Make changes**:
```bash
cd vscode
npm run watch      # Terminal 1: Watch mode
./scripts/code.sh  # Terminal 2: Run and test

# Make your modifications in the vscode/ directory
# Test thoroughly
```

3. **Complete patch**:
```bash
# Press any key in the patch.sh terminal
# Patch is saved to patches/my-feature-name.patch
```

4. **Verify patch**:
```bash
git apply --check patches/my-feature-name.patch
```

---

### Method 2: Manual Creation

For advanced users or complex changes.

#### Steps:

1. **Prepare clean workspace**:
```bash
./get_repo.sh
cd vscode
git checkout -b feature-branch
```

2. **Apply existing patches**:
```bash
cd ..
for patch in patches/*.patch; do
  cd vscode && git apply "../$patch" && cd ..
done
```

3. **Make changes and commit**:
```bash
cd vscode
# Make your changes
git add .
git commit -m "feat: My feature"
```

4. **Generate patch**:
```bash
git format-patch -1 HEAD --stdout > ../patches/my-feature.patch
```

5. **Clean up patch metadata**:
```bash
# Edit patch file to remove git metadata if desired
```

---

## Updating Existing Patches

When VS Code upstream changes conflict with patches:

### Semi-Automated Update

1. **Identify failing patch**:
```bash
./prepare_vscode.sh  # Will fail on conflicting patch
# Note which patch failed
```

2. **Update the patch**:
```bash
./dev/patch.sh existing-patch-name
```

The script will:
- Apply all patches *except* the target
- Apply the target patch with `--3way` (three-way merge)
- Pause for conflict resolution

3. **Resolve conflicts**:
```bash
cd vscode
# Fix conflicts in files
git add .
```

4. **Complete update**:
```bash
# Press any key in patch.sh terminal
# Updated patch overwrites old one
```

---

### Manual Update Process

1. **Clone fresh VS Code**:
```bash
rm -rf vscode
./get_repo.sh
```

2. **Apply patches sequentially**:
```bash
for patch in patches/*.patch; do
  echo "Applying $patch..."
  cd vscode
  git apply --3way "../$patch" || {
    echo "Conflict in $patch - resolve manually"
    break
  }
  cd ..
done
```

3. **Resolve conflicts**:
```bash
cd vscode
# Edit conflicting files
git add .
git am --continue
```

4. **Regenerate patch**:
```bash
git format-patch -1 HEAD --stdout > ../patches/updated-patch.patch
```

---

## Patch Management Best Practices

### Patch Naming

Use descriptive, kebab-case names:

**Good**:
- `disable-application-insights.patch`
- `add-openvsx-marketplace.patch`
- `remove-ms-branding.patch`

**Bad**:
- `patch1.patch`
- `fix.patch`
- `temp.patch`

---

### Patch Organization

Organize patches by category for clarity:

```
patches/
├── telemetry/
│   ├── 0001-disable-telemetry-main.patch
│   ├── 0002-remove-crash-reporter.patch
│   └── 0003-strip-appinsights.patch
├── branding/
│   ├── 0010-welcome-page.patch
│   ├── 0011-about-dialog.patch
│   └── 0012-product-json.patch
└── marketplace/
    ├── 0020-openvsx-integration.patch
    └── 0021-extension-gallery-urls.patch
```

---

### Patch Atomicity

**One patch = One logical change**

**Good** (atomic):
```
disable-telemetry.patch          # Only telemetry
update-marketplace-url.patch     # Only marketplace
```

**Bad** (mixed concerns):
```
telemetry-and-marketplace.patch  # Two unrelated changes
```

---

## Common Patch Categories

### 1. Telemetry Removal

**Files typically affected**:
- `src/vs/platform/telemetry/**/*.ts`
- `src/vs/platform/diagnostics/**/*.ts`
- `product.json`

**Example patch locations**:
```
patches/0001-disable-telemetry.patch
patches/0002-remove-appinsights.patch
patches/0003-disable-crash-reporter.patch
```

---

### 2. Marketplace Integration

**Files typically affected**:
- `src/vs/platform/extensionManagement/**/*.ts`
- `src/vs/platform/extensionGallery/**/*.ts`
- `product.json`

**Example patch**:
```diff
--- a/src/vs/platform/extensionManagement/common/extensionGalleryService.ts
+++ b/src/vs/platform/extensionManagement/common/extensionGalleryService.ts
@@ -10,7 +10,7 @@
-const MARKETPLACE_URL = 'https://marketplace.visualstudio.com'
+const MARKETPLACE_URL = 'https://open-vsx.org/vscode/gallery'
```

---

### 3. Branding Changes

**Files typically affected**:
- `src/vs/workbench/browser/parts/dialogs/**/*.ts`
- `src/vs/workbench/contrib/welcome/**/*.ts`
- `resources/**/*`

---

### 4. Build Configuration

**Files typically affected**:
- `build/**/*.js`
- `package.json`
- `.yarnrc`

---

## Testing Patches

### Unit Test Patches

```bash
cd vscode
npm test
```

### Integration Test Patches

```bash
./build.sh
cd vscode
./scripts/test-integration.sh
```

### Manual Testing

```bash
./build.sh
cd vscode
./scripts/code.sh  # Launch built CodeSphere
```

**Test checklist**:
- [ ] Application launches
- [ ] Branding is correct
- [ ] Telemetry is disabled (check network tab)
- [ ] Extensions install from OpenVSX
- [ ] No console errors

---

## Troubleshooting

### Patch Fails to Apply

**Symptom**: `git apply` returns error

**Diagnosis**:
```bash
git apply --check patches/failing-patch.patch
```

**Solutions**:

1. **Retry with 3-way merge**:
```bash
git apply --3way patches/failing-patch.patch
```

2. **Check line endings**:
```bash
dos2unix patches/failing-patch.patch
```

3. **Regenerate patch** following update process

---

### Patch Applies but Breaks Build

**Symptom**: `npm run compile` fails

**Debug**:
```bash
cd vscode
npm run watch  # See TypeScript errors in real-time
```

**Common causes**:
- Upstream API changes
- TypeScript type mismatches
- Import path changes

**Solution**: Update patch to match new upstream code

---

### Merge Conflicts

**Symptom**: Git reports conflicts during `git apply --3way`

**Resolution**:
```bash
# Open conflicted files
vim src/vs/platform/telemetry/common/telemetry.ts

# Look for conflict markers:
<<<<<<< ours
// CodeSphere code
=======
// Upstream code
>>>>>>> theirs

# Resolve manually
git add .
```

---

## Advanced Techniques

### Patch Stacking

Apply patches in specific order for dependencies:

```bash
# Base patch must apply first
patches/0001-base-change.patch

# Dependent patches
patches/0002-feature-using-base.patch
patches/0003-another-feature-using-base.patch
```

---

### Conditional Patching

Apply patches only for specific platforms:

```bash
if [ "$OS_NAME" == "darwin" ]; then
  git apply patches/macos-only.patch
fi
```

---

### Patch Versioning

Track patch compatibility with VS Code versions:

```
patches/
├── stable-1.85/
│   ├── 0001-telemetry.patch
│   └── 0002-marketplace.patch
├── stable-1.86/
│   ├── 0001-telemetry-updated.patch
│   └── 0002-marketplace.patch
└── current -> stable-1.86/
```

---

## Patch Contribution Workflow

### Before Creating a Patch

1. **Search existing patches**: Check if similar patch exists
2. **Discuss in issues**: Propose change in GitHub issue
3. **Test thoroughly**: Verify on all platforms if possible

### Submitting a Patch

1. **Create patch** using `dev/patch.sh`
2. **Test build**:
```bash
./prepare_vscode.sh
./build.sh
```
3. **Open PR** with:
   - Clear description of change
   - Reason for patch
   - Testing performed
   - Affected platforms

### Patch Review Checklist

- [ ] Patch applies cleanly
- [ ] Build succeeds on all platforms
- [ ] No unintended side effects
- [ ] Patch is atomic (one logical change)
- [ ] Well-named patch file
- [ ] Documentation updated if needed

---

## Maintenance Schedule

### Monthly

- Update patches for new VS Code stable release
- Test all patches against new upstream

### Quarterly

- Review patch necessity (has upstream fixed it?)
- Consolidate related patches if beneficial
- Remove obsolete patches

### Annually

- Full patch audit
- Refactor patch organization
- Document patch rationale

---

## References

- [Git patch documentation](https://git-scm.com/docs/git-apply)
- [Unified diff format](https://www.gnu.org/software/diffutils/manual/html_node/Unified-Format.html)
- [VS Code build guide](https://github.com/microsoft/vscode/wiki/How-to-Contribute)

---

## Quick Reference

### Common Commands

```bash
# Create new patch
./dev/patch.sh my-feature

# Apply all patches
for p in patches/*.patch; do git apply "$p"; done

# Check patch validity
git apply --check my-patch.patch

# Apply with conflict resolution
git apply --3way my-patch.patch

# Generate patch from commit
git format-patch -1 HEAD --stdout > my.patch
```
