# CodeSphere Patch System Manifesto

## 1. The Core Philosophy
CodeSphere is not an extension; it is a **patched editor runtime**. To manage "upstream debt" (drift from VS Code core), we treat patches as **First-Class Domain Logic**.

## 2. Semantic Patch Classes
Patches must be organized into semantic buckets. This allows us to disable or upgrade entire feature sets without breaking the core IDE.

| Class | Purpose | Examples |
|-------|---------|----------|
| `branding/` | Visual identity, icons, names | `brand.patch`, `binary-name.patch` |
| `core/` | Hardened platform overrides | `telemetry.patch`, `disable-update.patch` |
| `ai/` | Native AI runtime integration | `zz-inject-ai-daemon.patch` |
| `fix/` | Upstream bug fixes / build fixes | `fix-npm-preinstall.patch` |
| `feat/` | New platform-specific features | `feat-announcements.patch` |

## 3. Patch Invariants
- **Atomic**: Each patch should do one thing.
- **Annotated**: Every patch MUST have a header describing *why* it exists and which VS Code version it targets.
- **Semantic Pathing**: Patches are applied in order: `core` -> `branding` -> `feat` -> `ai`.

## 4. The "Patch Debt" Protocol
When a patch fails due to upstream changes:
1. **Audit**: Is the patch still needed? (Did VS Code implement it?)
2. **Rebase**: Re-run the patch generation against the new VS Code tag.
3. **Classify**: If a patch is constantly breaking, move it to a `volatile/` class for closer monitoring.
