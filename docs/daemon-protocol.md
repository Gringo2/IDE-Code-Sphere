# CodeSphere Daemon Protocol (v1.0.0)

This document defines the JSON-RPC 2.0 protocol for communication between the CodeSphere IDE extension host and the native AI runtime daemon.

## Protocol Invariants

- **Version awareness**: All messages must include a `version` string, for example `"1.0.0"`.
- **Domain separation**: Requests are namespaced by domain: `chat`, `context`, `index`, and `sys`.
- **Layer integrity**: Deterministic symbol graph results and probabilistic embedding results must be returned in separate fields so the host can weight them differently.

## Transport

- **Default**: WebSocket (`ws://localhost:PORT`)
- **Alternative**: Named pipes or Unix sockets. This is still to be decided.

## Message Format

All messages follow the [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification).

```json
{
  "jsonrpc": "2.0",
  "method": "...",
  "params": {
    "version": "1.0.0"
  },
  "id": 1
}
```

## Chat API

### `chat/send`

Sends a message to the AI runtime.

- **Request**: `{ message: string, context?: ContextItem[], version: string }`
- **Response**: `null`
- **Notifications**: `chat/delta`, `chat/error`

### `chat/stop`

Cancels the current generation.

- **Request**: `{ id?: string, version: string }`
- **Response**: `null`

### `chat/delta`

Streams a partial assistant response from daemon to host.

- **Notification**: `{ id: string, delta: string, done?: boolean, version: string }`

### `chat/error`

Reports a chat runtime error.

- **Notification**: `{ id?: string, message: string, code?: string, recoverable: boolean, version: string }`

## Context & Indexing API

### `context/add`

Adds an item to active context.

- **Request**: `{ uri: string, content?: string, type: "file" | "symbol" | "snippet", version: string }`
- **Response**: `null`

### `context/remove`

Removes an item from active context.

- **Request**: `{ uri: string, version: string }`
- **Response**: `null`

### `index/getSymbols`

Builds or queries deterministic AST-based symbol context.

- **Result**: `Array<{ symbol: string, type: string, location: Range }>`

### `index/searchSemantic`

Searches semantic context using vector similarity.

- **Result**: `Array<{ path: string, snippet: string, score: number }>`

## System API

### `sys/status`

Returns daemon health, model state, and indexing progress.

- **Notification**: `{ state: "idle" | "busy" | "error", message?: string, version: string }`

### `sys/negotiate`

Exchanges runtime capabilities between host and daemon.

- **Request/notification**: `{ contract: RuntimeContract, timestamp: number, version: string }`

### `sys/shutdown`

Gracefully stops the daemon.

- **Request**: `{ version: string }`
- **Response**: `null`

## Event Bus (Internal)

The extension host maintains an internal event bus to route protocol messages between the UI, host services, and daemon adapter.

| Topic | Data | Description |
| :--- | :--- | :--- |
| `chat/send` | `{ text }` | UI to host to daemon |
| `chat/delta` | `{ id, delta, done? }` | Daemon to host to UI |
| `context/add` | `{ uri }` | UI or host adds an item to active context |
| `context/update` | `{ uri }` | Context service updates UI state |
| `sys/status` | `{ state }` | Daemon or host status update |

See `docs/design/event-contract.md` for the canonical internal topic registry.
