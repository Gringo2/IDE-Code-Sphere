# CodeSphere IDE Design Documentation

Welcome to the internal design documentation for **CodeSphere IDE**. This repository contains the source code, build infrastructure, and CI/CD pipelines for a customized, rebranded version of VS Code / VSCodium.

## Documentation Sections

*   **[SRS](srs.md)**: Software Requirements Specification covering core functionality and distribution.
*   **[System Design](system_design.md)**: High-level goals, core principles, and rebranded identity.
*   **[Architecture](architecture.md)**: Deep dive into the repository structure, build scripts, and the build process logic.
*   **[Diagrams](diagrams.md)**: Visual representations of the build system and component interactions.
*   **[AI Native Research Plan](ai-native-research-plan.md)**: Research spike plan for the built-in AI extension, daemon boundary, context system, and MVP workflow.
*   **[AI Native Event Contract](event-contract.md)**: Canonical internal event topics, domains, payloads, and current drift.

## Project Overview

CodeSphere IDE is built on top of VSCodium with a focus on:
- Efficient, automated multi-platform builds.
- Seamless rebranding (System Zero ecosystem integration).
- Robust CI/CD using GitHub Actions.
