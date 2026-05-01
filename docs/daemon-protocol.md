# CodeSphere Daemon Protocol (v1.0.0)

This document defines the JSON-RPC 2.0 protocol for communication between the CodeSphere IDE (Extension Host) and the Native AI Runtime (Daemon).

## 🛡️ Protocol Invariants
- **Version Awareness**: All messages MUST include a `version` string (e.g., `"1.0.0"`).
- **Domain Separation**: Requests are namespaced by domain (chat, context, index, sys).
- **Layer Integrity**: Deterministic (Symbol Graph) and Probabilistic (Embeddings) results must be returned in separate fields to allow the Host to weight them differently.

## Transport
- **Default**: WebSocket (`ws://localhost:PORT`)
- **Alternative**: Named Pipes / Unix Sockets (TBD)

## Message Format
All messages follow the [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification).

```json
{
  "jsonrpc": "2.0",
  "method": "...",
  "params": { ... },
  "id": 1
}
```

---

## 💬 Chat API

### `chat/send`
Sends a message to the AI.
- **Request**:
  - `message`: string (user input)
  - `context?`: Array<ContextItem>
- **Response**: `null` (Acknowledgment)
- **Notifications (Stream)**:
  - `chat/delta`: Partial text chunks.
  - `chat/done`: Final completion state.

### `chat/stop`
Cancels the current generation.

---

## 🗂️ Context & Indexing API

### `index/deterministic` (Symbol Graph)
Builds/queries the deterministic AST-based symbol graph.
- **Method**: `index/getSymbols`
- **Result**: `Array<{ symbol: string, type: string, location: Range }>`

### `index/probabilistic` (Embeddings)
Semantic search across the codebase using vector similarity.
- **Method**: `index/searchSemantic`
- **Result**: `Array<{ path: string, snippet: string, score: number }>`

---

## ⚙️ System API

### `system/getStatus`
Returns the daemon's health, model state, and indexing progress.

### `system/shutdown`
Gracefully stops the daemon.

---

## 📅 Event Bus (Internal)
The Extension Host maintains an internal Event Bus to route these protocol messages to the UI.

| Topic | Data | Description |
|-------|------|-------------|
| `chat:send` | `{ text }` | UI → Host → Daemon |
| `chat:delta` | `{ text }` | Daemon → Host → UI |
| `context:add`| `{ uri }` | UI → Host (Adds file to active context) |
| `status:update`| `{ state }` | Daemon → Host → UI |
