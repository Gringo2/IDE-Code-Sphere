# Dev Scripts Reference

Complete reference for all helper scripts in the CodeSphere IDE repository.

## Build Scripts

### Core Build Scripts

#### `build.sh`
**Location**: `./build.sh`

**Purpose**: Main build script for VS Code core application

**Usage**:
```bash
./build.sh
```

**Environment Variables**:
- `OS_NAME`: Target OS (darwin, linux, win32)
- `VSCODE_ARCH`: Architecture (x64, arm64, armhf)
- `SHOULD_BUILD_ZIP`: Build ZIP archive (yes/no)
- `SHOULD_BUILD_DEB`: Build Debian package (yes/no)
- `SHOULD_BUILD_RPM`: Build RPM package (yes/no)
- `SHOULD_BUILD_APPIMAGE`: Build AppImage (yes/no)

**Outputs**:
- `vscode/.build/electron/`: Built application
- `assets/`: Packaged installers

---

#### `build_cli.sh`
**Location**: `./build_cli.sh`

**Purpose**: Builds the `code` command-line tool

**Usage**:
```bash
./build_cli.sh
```

**What it builds**:
- Standalone CLI binary
- Shell integration scripts
- Man pages

**Outputs**:
- `vscode/cli/target/release/code`: CLI binary

---

### Icon Generation

#### `build_master_icons.js`
**Location**: `./build_master_icons.js`

**Purpose**: Generates PNG icons at all required sizes from SVG source

**Usage**:
```bash
node build_master_icons.js
```

**Source**: `icons/icon_base.svg`

**Outputs**:
```
icons/stable/codesphere_16.png
icons/stable/codesphere_24.png
...
icons/stable/codesphere_512.png
icons/insider/codesphere_16.png (with badge)
...
```

**Dependencies**: Node.js, Sharp library

---

#### `convert_icons.js`
**Location**: `./convert_icons.js`

**Purpose**: Converts PNG icons to platform-specific formats

**Usage**:
```bash
node convert_icons.js
```

**Inputs**: PNG files from `build_master_icons.js`

**Outputs**:
- `icons/stable/codesphere.ico` (Windows)
- `icons/stable/codesphere.icns` (macOS)
- `icons/insider/codesphere.ico`
- `icons/insider/codesphere.icns`

**Dependencies**: ImageMagick, iconutil (macOS)

---

#### `gen_bmp.ps1`
**Location**: `./gen_bmp.ps1`

**Purpose**: Generates BMP images for Windows MSI installer

**Usage**:
```powershell
.\gen_bmp.ps1
```

**Outputs**:
- `build/win32/banner.bmp`: Installer banner (493×58 px)
- `build/win32/dialog.bmp`: Dialog background (493×312 px)

---

## Source Preparation

#### `prepare_vscode.sh`
**Location**: `./prepare_vscode.sh`

**Purpose**: Master script for applying all patches and rebranding

**Usage**:
```bash
./prepare_vscode.sh
```

**Executes**:
1. `prepare_src.sh`: Clone VS Code source
2. Git patches from `patches/`
3. `prepare_assets.sh`: Copy icons
4. `undo_telemetry.sh`: Remove telemetry
5. Product.json modifications

---

#### `prepare_src.sh`
**Location**: `./prepare_src.sh`

**Purpose**: Initial setup of VS Code source directory

**Usage**:
```bash
./prepare_src.sh
```

**Actions**:
- Creates `vscode/` directory
- Initializes git if needed
- Sets up npm/yarn configuration

---

#### `prepare_assets.sh`
**Location**: `./prepare_assets.sh`

**Purpose**: Copies generated icons and assets into VS Code source tree

**Usage**:
```bash
./prepare_assets.sh
```

**File Mappings**:
```
icons/stable/codesphere.ico → vscode/resources/win32/code.ico
icons/stable/codesphere.icns → vscode/resources/darwin/code.icns
icons/stable/codesphere_*.png → vscode/resources/linux/code.png
```

---

#### `prepare_checksums.sh`
**Location**: `./prepare_checksums.sh`

**Purpose**: Generates SHA256 checksums for release artifacts

**Usage**:
```bash
./prepare_checksums.sh
```

**Output**: `SHA256SUMS.txt`

---

## Rebranding Scripts

#### `mass_rebrand.ps1`
**Location**: `./mass_rebrand.ps1`

**Purpose**: Text-based rebranding of all source files

**Usage**:
```powershell
.\mass_rebrand.ps1
```

**Replacements**:
- "Visual Studio Code" → "CodeSphere"
- "vscode" → "codesphere"
- "Microsoft" → "System Zero"

See: [Rebranding Guide](./rebranding-guide.md)

---

#### `mass_rebrand_nuclear.ps1`
**Location**: `./mass_rebrand_nuclear.ps1`

**Purpose**: Aggressive variant with file system changes

**⚠️ Warning**: Makes irreversible changes

---

#### `mass_rebrand_super.ps1`
**Location**: `./mass_rebrand_super.ps1`

**Purpose**: Extended rebranding including marketplace URLs

---

#### `undo_telemetry.sh`
**Location**: `./undo_telemetry.sh`

**Purpose**: Removes all telemetry and tracking code

**Usage**:
```bash
./undo_telemetry.sh
```

**Actions**:
- Modifies `product.json`
- Removes ApplicationInsights
- Disables crash reporter

---

## Version & Upstream Management

#### `get_repo.sh`
**Location**: `./get_repo.sh`

**Purpose**: Fetches and checks out specific VS Code version

**Usage**:
```bash
./get_repo.sh
```

**Environment**:
- `MS_TAG`: VS Code tag to checkout
- `MS_COMMIT`: Specific commit hash

**Outputs**: Populated `vscode/` directory

---

#### `update_version.sh`
**Location**: `./update_version.sh`

**Purpose**: Determines CodeSphere release version

**Usage**:
```bash
source ./update_version.sh
echo $RELEASE_VERSION
```

**Sets**:
- `RELEASE_VERSION`: Full version string
- `VSCODE_VER`: Base VS Code version

---

#### `version.sh`
**Location**: `./version.sh`

**Purpose**: Simple version variable helper

**Usage**:
```bash
source ./version.sh
```

---

#### `update_upstream.sh`
**Location**: `./update_upstream.sh`

**Purpose**: Syncs with latest VS Code releases

**Usage**:
```bash
./update_upstream.sh
```

**Actions**:
- Fetches microsoft/vscode
- Detects new tags/commits
- Updates local references

---

## CI/CD Scripts

#### `check_cron_or_pr.sh`
**Location**: `./check_cron_or_pr.sh`

**Purpose**: Determines if build was triggered by cron or PR

**Usage**:
```bash
./check_cron_or_pr.sh
```

**Outputs**: `IS_CRON=true` or `IS_PR=true`

---

#### `check_tags.sh`
**Location**: `./check_tags.sh`

**Purpose**: Determines if a build is needed by checking existing releases

**Usage**:
```bash
./check_tags.sh
```

**Environment**:
- `ASSETS_REPOSITORY`: Target release repo
- `MS_COMMIT`: Upstream commit to check

**Outputs**:
- `SHOULD_BUILD=yes|no`
- `LATEST_VERSION`: Most recent release version

See: [CI/CD Workflows](./ci-cd-workflows.md)

---

#### `get_pr.sh`
**Location**: `./get_pr.sh`

**Purpose**: Fetches PR information for PR builds

**Usage**:
```bash
./get_pr.sh
```

---

#### `release.sh`
**Location**: `./release.sh`

**Purpose**: Uploads artifacts to GitHub Releases

**Usage**:
```bash
./release.sh
```

**Required Environment**:
- `RELEASE_VERSION`
- `GITHUB_TOKEN`
- `MS_TAG`
- `MS_COMMIT`

**Actions**:
1. Creates GitHub release
2. Uploads all assets
3. Attaches checksums
4. Publishes release

See: [Release Process](./release-process.md)

---

#### `upload_sourcemaps.sh`
**Location**: `./upload_sourcemaps.sh`

**Purpose**: Uploads source maps for debugging

**Usage**:
```bash
./upload_sourcemaps.sh
```

---

## Patch Management

### `dev/patch.sh`
**Location**: `./dev/patch.sh`

**Purpose**: Creates new patches or updates existing ones

**Usage**:
```bash
./dev/patch.sh <patch-name>
```

**Workflow**:
1. Clones fresh VS Code
2. Applies all existing patches except target
3. Pauses for manual changes
4. Generates diff as new patch

See: [Patch System](./patch-system.md)

---

## Utility Scripts

#### `utils.sh`
**Location**: `./utils.sh`

**Purpose**: Common shell functions used by other scripts

**Functions**:
- `check_command()`: Verify command exists
- `download_file()`: Robust file download
- `extract_archive()`: Universal archive extraction

**Usage**:
```bash
source ./utils.sh
check_command node
```

---

## Development Helpers

### `dev/` Directory

Thedev/` folder contains helper scripts for development:

```
dev/
├── patch.sh          # Patch creation/update
├── build_test.sh     # Test builds without full CI
├── icon_preview.sh   # Preview icons in various contexts
├── clean.sh          # Clean build artifacts
├── reset_src.sh      # Reset vscode/ directory
├── apply_patch.sh    # Apply single patch
└── verify_build.sh   # Post-build verification
```

---

## Script Dependencies

### Required Tools

| Script | Dependencies |
|--------|--------------|
| `build.sh` | Node.js, npm, Python, Git |
| `build_master_icons.js` | Node.js, Sharp |
| `convert_icons.js` | ImageMagick, iconutil |
| `gen_bmp.ps1` | PowerShell 5.1+, .NET |
| `prepare_vscode.sh` | Git, Bash 4+ |
| `release.sh` | GitHub CLI (`gh`), `jq` |

### Platform-Specific

**Windows**:
- Visual Studio 2019/2022
- WiXToolset 3.11+
- Windows SDK

**macOS**:
- Xcode Command Line Tools
- iconutil (included with Xcode)

**Linux**:
- dpkg-deb (Debian packaging)
- rpmbuild (RPM packaging)
- AppImageTool

---

## Environment Variables Reference

### Build Configuration

```bash
# Platform
OS_NAME="linux"              # darwin, linux, win32
VSCODE_ARCH="x64"            # x64, arm64, armhf

# Versioning
RELEASE_VERSION="1.85.0.123"
MS_TAG="1.85.0"
MS_COMMIT="abc123"

# Build Flags
SHOULD_BUILD="yes"
SHOULD_BUILD_ZIP="yes"
SHOULD_BUILD_DEB="yes"
SHOULD_BUILD_RPM="no"
SHOULD_BUILD_APPIMAGE="yes"

# Authentication
GITHUB_TOKEN="ghp_..."
SIGNPATH_API_TOKEN="sp_..."
APPLE_ID="dev@example.com"
```

---

## Troubleshooting

### Script Errors

**Symptom**: `prepare_vscode.sh` fails

**Debug**:
```bash
bash -x ./prepare_vscode.sh 2>&1 | tee debug.log
```

---

### Missing Dependencies

**Symptom**: "command not found"

**Solution**:
```bash
# Check all dependencies
./utils.sh check_all_deps
```

---

## Best Practices

1. **Always source version scripts**: Use `source` not `.` for portability
2. **Check return codes**: Verify script success before continuing
3. **Use environment variables**: Don't hardcode paths
4. **Log verbosely in CI**: Use `-x` flag for debugging
5. **Test locally first**: Run scripts locally before committing

---

## Quick Reference

### Common Workflows

**Full build from scratch**:
```bash
./get_repo.sh
./prepare_vscode.sh
./build.sh
./build_cli.sh
```

**Icon update**:
```bash
node build_master_icons.js
node convert_icons.js
./prepare_assets.sh
```

**Create patch**:
```bash
./dev/patch.sh my-feature
```

**Release**:
```bash
./prepare_checksums.sh
./release.sh
```
