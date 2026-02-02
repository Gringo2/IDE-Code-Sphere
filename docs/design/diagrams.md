# Architecture Diagrams

## Build System Mind Map

This diagram visualizes the end-to-to workflow of the CodeSphere build pipeline, from upstream tracking to artifact release.

```mermaid
mindmap
  root((CodeSphere Build System))
    Upstream Tracking
      VSCode Repo (Microsoft)
      VSCodium Build Agents
      Version Metadata (upstream/*.json)
    Spearhead Orchestration
      Check for Updates (check_tags.sh)
      Clone & Prepare Source (get_repo.sh)
      Dispatch Platform Builds
    Platform Execution
      Linux
        Docker Agents (vscodium namespace)
        DEB / RPM / AppImage / Alpine
      Windows
        WiX Toolset (MSI)
        Inno Setup (EXE)
        Signing (SignPath)
      MacOS
        Intel (macos-15)
        Silicon (self-hosted arm64)
        Notarization & DMG
    Release & Distribution
      Assets Repo (Insiders/Stable)
      Versions Repo tracking
      WinGet / Snap Store Dispatch
```

## Component Interconnection

```mermaid
graph TD
    A[Upstream VSCode] --> B(Spearhead Workflow)
    B --> C{New Version?}
    C -- Yes --> D[Prepare Source]
    D --> E[Dispatch Builds]
    E --> F[Linux Runner]
    E --> G[Windows Runner]
    E --> H[MacOS Runner]
    F --> I[GitHub Releases]
    G --> I
    H --> I
    I --> J[User Feedback/Updates]
```

## Component Implementation State

This diagram highlights which parts of the system are currently operational and which are awaiting further development (stubs).

```mermaid
graph LR
    subgraph Fully Implemented
        direction TB
        msi[Windows MSI/WiX]
        linux[Linux Docker Agents]
        gpg[GPG Release Signing]
        tags[check_tags.sh Logic]
    end

    subgraph Maturing
        direction TB
        macos[MacOS Notarization]
        alpine[Alpine REH Packaging]
    end

    subgraph Stubs / Planned
        direction TB
        signpath[SignPath API Integration]
        winget[WinGet Auto-Publishing]
    end

    tags --> msi
    tags --> linux
    msi -.-> signpath
    macos -.-> notarize[Apple Notarization Service]
```
