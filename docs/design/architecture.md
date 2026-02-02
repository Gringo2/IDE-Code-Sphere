# Architecture & Source Layout

## Repository Structure

The CodeSphere IDE repository is organized to facilitate the fork-and-patch build model used for VSCodium derivatives.

| Directory | Description |
| :--- | :--- |
| `build/` | Contains the platform-specific build logic (Shell scripts, MSI source files, etc.). |
| `docs/` | User-facing documentation and project guides. |
| `designdocs/` | Internal system design and architectural documentation. |
| `.github/workflows/` | CI/CD pipeline definitions for all build qualities and platforms. |
| `upstream/` | Versioning JSON files that track the current target VS Code commits. |

## Implementation Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Windows MSI** | ✅ Implemented | Full WiX toolset integration. UTF-8 BOM encoding for i18n. Proper icon definitions. |
| **Linux (x64/ARM)** | ✅ Implemented | Docker-based builds using `vscodium` namespace agents. |
| **MacOS (Silicon/Intel)** | 🛠️ In Progress | Basic builds functional. Notarization and DMG generation being refined. |
| **Alpine Linux** | ⚠️ Partial | REH (Remote Extension Host) logic implemented; platform-specific packaging maturation needed. |
| **SignPath Integration** | 🏗️ Stubbed | Configuration present in workflows; API key/token plumbing required for production. |
| **GPG Signing** | ✅ Implemented | Spearhead release signing via `ghaction-import-gpg`. |

## Build Script Deep Dive

### `check_tags.sh`
The primary logic for determining if a build is necessary. It queries the GitHub API to check if the current `MS_COMMIT` has already been released in the `ASSETS_REPOSITORY`. Recent updates handle "initial build" scenarios where no releases exist yet.

### `get_repo.sh`
Responsible for calculating the `RELEASE_VERSION` and shallow-cloning the target commit from the official Microsoft VS Code repository. It uses a dynamic timestamp-based versioning scheme for Insiders.

### `build.sh` (Root)
The entry point for building. It prepares the environment and invokes the appropriate `package_*.sh` scripts. Note: Platform-specific logic often resides in `build/[platform]/package_*.sh`.

## Packaging Layer

- **Linux**: Uses Docker containers (`vscodium/vscodium-linux-build-agent`) to produce `.deb`, `.rpm`, and `.tar.gz` assets.
- **Windows**: Utilities like WiX Toolset are used to generate signed MSI and EXE installers. The `build/windows/msi` directory is the epicenter of the Windows rebranding logic.
- **MacOS**: Builds for Intel and Silicon are produced on GitHub-hosted and self-hosted runners.
