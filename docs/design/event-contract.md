# AI Native Event Contract

## Purpose

This document defines the internal event contract between the CodeSphere AI webviews, extension host services, observability layer, and future daemon adapter. The code should treat this as the canonical topic list.

## Naming

Use slash-separated topics:

- `chat/send`
- `chat/delta`
- `context/add`
- `sys/status`

Avoid colon-separated names such as `chat:send`. Older daemon protocol notes used colon-separated examples; slash-separated names now match the extension code and governance registry.

## Domains

| Domain | Meaning |
| :--- | :--- |
| `ui` | Webview UI event source. |
| `host` | Extension host orchestration code. |
| `chat` | Chat service or daemon adapter. |
| `context` | Context collection and indexing service. |
| `sys` | System lifecycle, negotiation, diagnostics, and snapshots. |

## Canonical Topics

| Topic | Owner | Allowed Emitters | Direction | Payload |
| :--- | :--- | :--- | :--- | :--- |
| `chat/send` | `chat` | `ui` | UI to host/chat service | `{ text: string, context?: ContextItem[], version: string }` |
| `chat/delta` | `chat` | `chat` | Chat service to UI | `{ id: string, delta: string, done?: boolean, version: string }` |
| `chat/error` | `chat` | `chat` | Chat service to UI | `{ id?: string, message: string, code?: string, recoverable: boolean, version: string }` |
| `chat/stop` | `chat` | `ui`, `host` | UI/host to chat service | `{ id?: string, version: string }` |
| `context/add` | `context` | `ui`, `host` | UI/host to context service | `{ uri: string, content?: string, type: "file" \| "symbol" \| "snippet", version: string }` |
| `context/remove` | `context` | `ui`, `host` | UI/host to context service | `{ uri: string, version: string }` |
| `context/update` | `context` | `context`, `host` | Context service to UI | `{ uri: string, content?: string, type: "file" \| "symbol" \| "snippet", version: string }` |
| `sys/negotiate` | `sys` | `ui`, `host`, `chat`, `context` | Runtime capability exchange | `{ contract: RuntimeContract, timestamp: number, version: string }` |
| `sys/status` | `sys` | `host`, `chat`, `context`, `sys` | Runtime status update | `{ state: "idle" \| "busy" \| "error", message?: string, version: string }` |
| `sys/snapshot` | `sys` | `sys`, `host` | Observability snapshot | `{ uptime: number, traceCount: number, violationCount?: number, version: string }` |

## Current Drift In Code

| Drift | Location | Expected Resolution |
| :--- | :--- | :--- |
| Webview messages are emitted without a domain, so they default to `sys`. | `ChatSidebarProvider`, `ContextSidebarProvider` | Pass `ui` for webview-originated messages. |
| `AiService` emits `chat/delta` without a domain, so it defaults to `sys`. | `ai-service.ts` | Pass `chat` when emitting `chat/delta`. |
| Context topics are used but absent from `EventRegistry`. | `ContextSidebarProvider`, `protocol.ts`, `Governance.ts` | Add `context/add`, `context/remove`, and `context/update` contracts. |
| Older daemon protocol notes included colon-separated topic examples. | `docs/daemon-protocol.md` | Keep daemon protocol examples slash-separated. |
| `sys/snapshot` schema expects `violationCount`, but observability snapshot returns `traceCount`. | `Governance.ts`, `Observability.ts` | Align schema and return shape. |

## Governance Rules

- Unknown topics are blocked.
- Unauthorized emitters are blocked.
- Invalid payloads are blocked.
- Silent diagnostic channels may exist under `sys/gqi/`, but they are not traceable and must not carry user content.
- Traces must store payload hashes or metadata, not raw user prompts or file contents.

## Minimum Test Matrix

| Test | Expected Result |
| :--- | :--- |
| UI emits valid `chat/send` | Allowed and delivered to chat service. |
| UI emits `chat/delta` | Blocked. |
| Chat service emits valid `chat/delta` | Allowed and delivered to UI. |
| UI emits valid `context/add` | Allowed and delivered to context service. |
| Unknown topic | Blocked with `UNKNOWN_TOPIC`. |
| Missing required payload field | Blocked with `INVALID_PAYLOAD`. |
| Trace mutation after logging | Throws in strict mode. |

## MVP Implementation Notes

The first implementation pass should keep the event contract small. Add only the events needed for chat, context add/remove/update, status, error, cancellation, and negotiation. More specialized topics can be introduced after the daemon transport and first context source are working end to end.
