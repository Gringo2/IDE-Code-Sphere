# CI/CD Architecture

Detailed technical architecture of the CodeSphere IDE continuous integration and delivery system.

## System Overview

```mermaid
graph TB
    subgraph "Trigger Layer"
        CRON[GitHub Cron<br/>Daily Schedule]
        PUSH[Git Push<br/>to main]
        MANUAL[Manual Dispatch<br/>workflow_dispatch]
    end
    
    subgraph "Orchestration Layer"
        SPEAR[Spearhead Workflow<br/>insider-spearhead.yml]
        CHECK[check_tags.sh<br/>Build Decision]
    end
    
    subgraph "Build Layer"
        WIN[Windows Build<br/>insider-windows.yml]
        MAC[macOS Build<br/>insider-macos.yml]
        LIN[Linux Build<br/>insider-linux.yml]
    end
    
    subgraph "Artifact Layer"
        MSI[MSI/EXE<br/>Windows Installers]
        DMG[DMG/ZIP<br/>macOS Packages]
        DEB[DEB/RPM/AppImage<br/>Linux Packages]
    end
    
    subgraph "Distribution Layer"
        SIGN[Code Signing<br/>SignPath/Apple/GPG]
        RELEASE[GitHub Releases<br/>release.sh]
        CHECKSUM[SHA256SUMS.txt<br/>Verification]
    end
    
    CRON --> SPEAR
    PUSH --> SPEAR
    MANUAL --> SPEAR
    
    SPEAR --> CHECK
    CHECK -->|SHOULD_BUILD=yes| WIN
    CHECK -->|SHOULD_BUILD=yes| MAC
    CHECK -->|SHOULD_BUILD=yes| LIN
    CHECK -->|SHOULD_BUILD=no| SKIP[Skip Build]
    
    WIN --> MSI
    MAC --> DMG
    LIN --> DEB
    
    MSI --> SIGN
    DMG --> SIGN
    DEB --> SIGN
    
    SIGN --> RELEASE
    RELEASE --> CHECKSUM
```

## Build Matrix Architecture

### Multi-Dimensional Matrix

CodeSphere uses a **3D build matrix**:

1. **Quality** (2 options):
   - Stable
   - Insider

2. **Platform** (3 options):
   - Windows
   - macOS
   - Linux

3. **Architecture** (varies by platform):
   - Windows: x64, arm64
   - macOS: x64, arm64 (universal binary)
   - Linux: x64, arm64, armhf, riscv64

**Total combinations**: ~24 unique builds per release

### Matrix Visualization

```mermaid
graph LR
    subgraph "Quality Axis"
        STABLE[Stable]
        INSIDER[Insider]
    end
    
    subgraph "Platform Axis"
        WINDOWS[Windows]
        MACOS[macOS]
        LINUX[Linux]
    end
    
    subgraph "Architecture Axis"
        X64[x64]
        ARM64[arm64]
        ARMHF[armhf]
        RISCV[riscv64]
    end
    
    STABLE --> WINDOWS
    STABLE --> MACOS
    STABLE --> LINUX
    
    INSIDER --> WINDOWS
    INSIDER --> MACOS
    INSIDER --> LINUX
    
    WINDOWS --> X64
    WINDOWS --> ARM64
    
    MACOS --> X64
    MACOS --> ARM64
    
    LINUX --> X64
    LINUX --> ARM64
    LINUX --> ARMHF
    LINUX --> RISCV
```

## Spearhead Orchestrator Pattern

### Decision Flow

```mermaid
flowchart TD
    START([Cron Trigger]) --> FETCH[Fetch Upstream<br/>microsoft/vscode]
    FETCH --> GET_COMMIT[Get Latest Commit<br/>MS_COMMIT]
    GET_COMMIT --> CHECK_TAGS{check_tags.sh<br/>Release Exists?}
    
    CHECK_TAGS -->|No Release| SET_BUILD[SHOULD_BUILD=yes]
    CHECK_TAGS -->|Release Exists| SET_SKIP[SHOULD_BUILD=no]
    
    SET_BUILD --> DISPATCH_WIN[Dispatch Windows]
    SET_BUILD --> DISPATCH_MAC[Dispatch macOS]
    SET_BUILD --> DISPATCH_LIN[Dispatch Linux]
    
    SET_SKIP --> END_SKIP([Exit Early])
    
    DISPATCH_WIN --> WAIT{All Builds<br/>Complete?}
    DISPATCH_MAC --> WAIT
    DISPATCH_LIN --> WAIT
    
    WAIT -->|Success| CREATE_RELEASE[Create GitHub Release]
    WAIT -->|Failure| NOTIFY_FAIL[Notify Failure]
    
    CREATE_RELEASE --> END_SUCCESS([Release Published])
    NOTIFY_FAIL --> END_FAIL([Build Failed])
```

### Environment Variable Flow

```mermaid
sequenceDiagram
    participant Spearhead
    participant CheckTags
    participant EnvVars
    participant Builders
    
    Spearhead->>+CheckTags: Run check_tags.sh
    CheckTags->>CheckTags: Query GitHub API
    CheckTags-->>-Spearhead: SHOULD_BUILD, LATEST_VERSION
    
    Spearhead->>+EnvVars: Set Environment
    Note over EnvVars: MS_COMMIT<br/>MS_TAG<br/>RELEASE_VERSION<br/>SHOULD_BUILD<br/>SHOULD_DEPLOY
    
    Spearhead->>Builders: workflow_dispatch
    Note over Builders: Inherit all env vars
    
    Builders->>Builders: Build using env vars
    Builders-->>Spearhead: Artifacts
```

## Platform Build Pipelines

### Windows Pipeline

```mermaid
flowchart LR
    START([Windows Workflow]) --> SETUP[Setup Environment<br/>Visual Studio<br/>Node.js<br/>Python]
    SETUP --> CHECKOUT[Checkout Code<br/>actions/checkout@v4]
    CHECKOUT --> GET_REPO[get_repo.sh<br/>Clone VS Code]
    GET_REPO --> PREPARE[prepare_vscode.sh<br/>Apply Patches<br/>Rebrand]
    PREPARE --> BUILD[build.sh<br/>Compile TypeScript<br/>Bundle Webpack]
    BUILD --> BUILD_CLI[build_cli.sh<br/>Build CLI Tool]
    BUILD_CLI --> PACKAGE_USER[Package User Installer<br/>Inno Setup]
    PACKAGE_USER --> PACKAGE_SYSTEM[Package System Installer<br/>WiX MSI]
    PACKAGE_SYSTEM --> SIGN{Sign Binaries?}
    SIGN -->|Yes| SIGNPATH[SignPath API<br/>Authenticode]
    SIGN -->|No| UPLOAD
    SIGNPATH --> UPLOAD[Upload Artifacts<br/>GitHub Actions]
    UPLOAD --> END([Complete])
```

### macOS Pipeline

```mermaid
flowchart LR
    START([macOS Workflow]) --> MATRIX{Architecture<br/>Matrix}
    MATRIX -->|x64| BUILD_X64[Build x64]
    MATRIX -->|arm64| BUILD_ARM[Build arm64]
    
    BUILD_X64 --> SIGN_X64[Sign App<br/>Developer ID]
    BUILD_ARM --> SIGN_ARM[Sign App<br/>Developer ID]
    
    SIGN_X64 --> CREATE_DMG_X64[Create DMG<br/>with background]
    SIGN_ARM --> CREATE_DMG_ARM[Create DMG<br/>with background]
    
    CREATE_DMG_X64 --> NOTARIZE_X64[Notarize<br/>Apple Service]
    CREATE_DMG_ARM --> NOTARIZE_ARM[Notarize<br/>Apple Service]
    
    NOTARIZE_X64 --> STAPLE_X64[Staple Ticket<br/>to DMG]
    NOTARIZE_ARM --> STAPLE_ARM[Staple Ticket<br/>to DMG]
    
    STAPLE_X64 --> COMBINE{Create<br/>Universal?}
    STAPLE_ARM --> COMBINE
    
    COMBINE -->|Yes| UNIVERSAL[Combine to<br/>Universal Binary]
    COMBINE -->|No| UPLOAD[Upload Artifacts]
    
    UNIVERSAL --> UPLOAD
    UPLOAD --> END([Complete])
```

### Linux Pipeline

```mermaid
flowchart TD
    START([Linux Workflow]) --> SETUP[Setup Build Environment<br/>Docker Container]
    SETUP --> CHECKOUT[Checkout & Get Repo]
    CHECKOUT --> PREPARE[Prepare & Rebrand]
    PREPARE --> BUILD[Build Application]
    BUILD --> PACKAGE_DEB[Package DEB<br/>dpkg-deb]
    BUILD --> PACKAGE_RPM[Package RPM<br/>rpmbuild]
    BUILD --> PACKAGE_APPIMAGE[Package AppImage<br/>AppImageTool]
    BUILD --> PACKAGE_SNAP[Package Snap<br/>snapcraft]
    BUILD --> PACKAGE_TAR[Package Tarball<br/>tar.gz]
    
    PACKAGE_DEB --> SIGN_GPG[Sign with GPG]
    PACKAGE_RPM --> SIGN_GPG
    PACKAGE_APPIMAGE --> SIGN_GPG
    PACKAGE_SNAP --> SIGN_GPG
    PACKAGE_TAR --> SIGN_GPG
    
    SIGN_GPG --> UPLOAD[Upload All Formats]
    UPLOAD --> END([Complete])
```

## Signing Architecture

### Windows Code Signing Flow

```mermaid
sequenceDiagram
    participant Builder as Windows Builder
    participant SP as SignPath API
    participant Cert as Certificate Authority
    participant GH as GitHub Releases
    
    Builder->>Builder: Build unsigned EXE/MSI
    Builder->>SP: Upload artifact
    SP->>SP: Queue signing job
    SP->>Cert: Request signature
    Cert-->>SP: Signed cert
    SP->>SP: Apply Authenticode signature
    SP-->>Builder: Download signed artifact
    Builder->>Builder: Verify signature
    Builder->>GH: Upload signed artifact
```

### macOS Notarization Flow

```mermaid
sequenceDiagram
    participant Builder as macOS Builder
    participant Apple as Apple Notary
    participant User as End User
    
    Builder->>Builder: Sign app with Developer ID
    Builder->>Builder: Create DMG
    Builder->>Apple: Submit DMG for notarization
    Apple->>Apple: Scan for malware (5-30min)
    Apple-->>Builder: Notarization ticket
    Builder->>Builder: Staple ticket to DMG
    Builder->>User: Distribute notarized DMG
    User->>User: macOS verifies ticket
    Note over User: Gatekeeper allows install
```

## Caching Strategy

### Node Modules Cache

```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      vscode/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('vscode/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Build Cache

```yaml
- uses: actions/cache@v3
  with:
    path: |
      vscode/.build
      vscode/out
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-
```

## Failure Handling

### Retry Logic

```mermaid
flowchart TD
    START([Build Started]) --> BUILD{Build Success?}
    BUILD -->|Success| END_SUCCESS([Upload Artifacts])
    BUILD -->|Failure| RETRY{Retry Count<br/>< 3?}
    RETRY -->|Yes| WAIT[Wait 60s]
    WAIT --> BUILD
    RETRY -->|No| NOTIFY[Notify Team]
    NOTIFY --> END_FAIL([Build Failed])
```

### Partial Build Recovery

If one platform fails:

1. **Other platforms continue**: Builds are independent
2. **Spearhead marks partial**: `PARTIAL_BUILD=yes`
3. **Manual trigger available**: Re-run failed platform only

## Performance Optimizations

### Parallel Execution

```mermaid
gantt
    title Build Parallelization
    dateFormat HH:mm
    section Platforms
    Windows Build    :a1, 00:00, 45m
    macOS Build      :a2, 00:00, 60m
    Linux Build      :a3, 00:00, 40m
    section Signing
    Windows Sign     :after a1, 5m
    macOS Notarize   :after a2, 15m
    Linux Sign       :after a3, 2m
    section Release
    Create Release   :milestone, after a1 a2 a3, 0m
```

**Total Time**: ~75 minutes (parallelized) vs ~145 minutes (sequential)

### Build Cache Hit Rate

| Cache Type | Typical Hit Rate | Time Saved |
|------------|------------------|------------|
| Node Modules | 85% | ~10 minutes |
| TypeScript Build | 60% | ~5 minutes |
| Webpack Bundle | 40% | ~3 minutes |

## Monitoring & Observability

### Metrics Tracked

1. **Build Duration**: Per platform, per step
2. **Cache Hit Rates**: npm, build output
3. **Failure Rates**: By platform, by error type
4. **Artifact Sizes**: Trend over time

### Alerts

- Build failure notification via GitHub Actions
- Long-running builds (>2 hours)
- Signing failures
- Artifact upload failures

## Security Considerations

### Secret Management

```yaml
secrets:
  SIGNPATH_API_TOKEN:
    required: true
    description: SignPath API key for Windows signing
  
  APPLE_ID:
    required: true
    description: Apple Developer account for notarization
  
  GPG_PRIVATE_KEY:
    required: true
    description: GPG key for Linux package signing
```

### Artifact Verification

```bash
# Windows
Get-AuthenticodeSignature CodeSphere.exe

# macOS
spctl -a -vvv CodeSphere.dmg

# Linux
gpg --verify CodeSphere.deb.asc
```

## Disaster Recovery

### Rollback Procedure

1. **Unpublish release** via GitHub API
2. **Delete release tag**
3. **Re-run previous build** if needed
4. **Communicate** via GitHub Discussions

### Backup Strategy

- **Source code**: Multiple git remotes
- **Build artifacts**: Retained for 90 days
- **Signing certificates**: Stored in secure vault

## Future Improvements

### Planned

- [ ] Matrix builds for all architectures simultaneously
- [ ] Self-hosted runners for faster builds
- [ ] Artifact caching across workflows
- [ ] Automated rollback on critical failures

### Under Consideration

- [ ] Blue-green deployment strategy
- [ ] Canary releases for insiders
- [ ] A/B testing framework
- [ ] Automated performance regression detection

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SignPath Integration Guide](https://about.signpath.io/documentation/build-system-integration)
- [Apple Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Semantic Release](https://semantic-release.gitbook.io/)
