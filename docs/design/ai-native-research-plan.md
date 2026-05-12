# AI Native Research Plan

## Purpose

This research spike turns the current CodeSphere AI-native scaffold into a grounded implementation plan. The immediate goal is not to choose every model or backend detail. It is to define the host, UI, daemon, context, and governance boundaries clearly enough that implementation can proceed without protocol drift.

## Current Baseline

The AI-native work is concentrated in `extensions/codesphere-ai-native`.

| Area | Current State |
| :--- | :--- |
| Extension host | Registers chat and context webview providers on startup. |
| Webview UI | React/Vite UI for chat and context management. |
| Event bus | Central `EventBus` with governance checks and trace logging. |
| Governance | Zod-backed registry for a small set of chat and system events. |
| Daemon bridge | Stubbed `AiService`; no real daemon call yet. |
| Context | UI/provider scaffolding exists, but context topics are not registered in governance. |

## Research Tracks

### 1. Codebase Reality

Map what the repository already does before designing new layers.

Research questions:

- How is the built-in extension packaged into CodeSphere releases?
- Which files participate in the extension activation path?
- Which topics are emitted by webviews, host services, and future daemon adapters?
- Which protocol names differ between code, tests, and docs?
- Which pieces are production behavior versus scaffold or mock behavior?

Evidence to collect:

- Extension manifest contribution points.
- `product.json` built-in extension entry.
- Event registry topics and payload schemas.
- Webview `postMessage` and host `onDidReceiveMessage` calls.
- Existing tests and their coverage gaps.

Deliverable:

- A short implementation map listing each runtime boundary and the files that own it.

### 2. Event Contract

Stabilize the governance contract before the daemon is integrated.

Research questions:

- What is the canonical topic naming style?
- Which domain owns each topic?
- Which domains may emit each topic?
- What schema validates each payload?
- Which events are blocked on validation failure, and which are diagnostic-only?
- How are error, cancellation, and status events represented?

Evidence to collect:

- `EventRegistry` in the host extension.
- `CodeSphereEvent` types in the protocol module.
- `docs/daemon-protocol.md`.
- Test cases for allowed and blocked emissions.

Deliverable:

- `event-contract.md` with canonical topics, emitters, payloads, and known drift.

### 3. Daemon Boundary

Define how the extension host talks to the native AI runtime.

Research questions:

- Should the daemon be launched by the extension, bundled with the app, or attached externally?
- Should the first transport be WebSocket, HTTP streaming, JSON-RPC over stdio, named pipe, or Unix socket?
- How does version negotiation work?
- How are daemon startup, crash recovery, restart, and shutdown handled?
- What is the local security model for daemon access?

Evidence to collect:

- Current daemon protocol draft.
- Packaging constraints for Windows, macOS, and Linux.
- VS Code extension host process constraints.
- Expected streaming and cancellation behavior.

Deliverable:

- Architecture decision record for daemon ownership and transport.

### 4. Context System

Define the minimum useful context flow.

Research questions:

- What context sources are MVP: selected text, active file, open editors, diagnostics, git diff, terminal output, workspace search?
- How are context items ranked, deduplicated, redacted, and removed?
- Which context data may be persisted?
- What content should be visible in traces versus hashed or summarized?

Evidence to collect:

- Context UI state model.
- Existing `ContextItem` type.
- VS Code APIs for selection, diagnostics, and workspace files.
- Privacy and telemetry requirements.

Deliverable:

- MVP context source list and event flow.

### 5. UX Workflow

Choose a first workflow that proves the architecture.

Candidate workflows:

- Chat with active-file context.
- Explain selected code.
- Fix visible diagnostics.
- Generate patch from prompt.
- Rebuild semantic index.

Selection criteria:

- Exercises UI to host to daemon to UI flow.
- Requires only a small, reviewable context source.
- Can be tested without a full production model backend.
- Produces a visible user benefit quickly.

Deliverable:

- MVP workflow definition with acceptance tests.

## Recommended Sequence

1. Align event contract names and emitters.
2. Add context topics to governance.
3. Add host-level integration tests for webview-to-service event flow.
4. Decide daemon transport and lifecycle.
5. Replace the mock AI service with a daemon adapter behind the same event contract.
6. Add the first real context source.
7. Expand UI workflows once the transport and governance layers are stable.

## Open Risks

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Event naming drift | Runtime messages are blocked by governance. | Make the event contract canonical and test it end to end. |
| Mock service hides integration failures | Chat appears implemented but no daemon path exists. | Introduce a daemon adapter interface with fake and real implementations. |
| Context payloads leak content into traces | Privacy and trust regression. | Trace hashes and metadata by default; keep raw content out of observability. |
| Platform packaging surprises | Daemon works locally but fails in releases. | Research daemon ownership before transport implementation. |
| Overbuilding governance early | Slows MVP iteration. | Keep strict governance for domain boundaries, but start with a minimal topic set. |

