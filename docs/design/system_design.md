# System Design

## Core Pillars

CodeSphere IDE is designed with the following principles at its core:

### 1. Rebranded Intelligence
The IDE is more than just a code editor; it is part of the **System Zero** ecosystem. This involves global rebranding of assets, icons, and metadata to present a unified "CodeSphere" identity.

### 2. Multi-Platform Build Sovereignty
We maintain complete control over our build infrastructure. By utilizing optimized Docker build agents (based on VSCodium's official agents) and GitHub Actions, we ensure that builds for Linux (x64, ARM, Alpine), Windows (MSI, EXE), and MacOS are consistent and reproducible.

### 3. Automated Lifecycle Management
From fetching the latest upstream VS Code commits to preparing release assets and updating version tracking repositories, every stage of the lifecycle is automated.

## Build Strategy

The project employs a "Spearhead" strategy for major build streams (Insider and Stable):
- **Spearhead Workflow**: Responsible for checking upstream updates, preparing source code, and dispatching platform-specific builds.
- **Platform-specific Workflows**: Specialized workers for Linux, Windows, and MacOS that handle compilation and packaging.
