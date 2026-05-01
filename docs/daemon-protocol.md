# CodeSphere Daemon Protocol (v1.0)

This document defines the JSON-RPC 2.0 protocol for communication between the CodeSphere IDE (Extension Host) and the Native AI Runtime (Daemon).

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

## 🗂️ Context API

### `context/indexWorkspace`
Triggers the daemon to build/update the semantic index.
- **Params**: `workspacePath`: string.

### `context/query`
Semantic search across the codebase.
- **Params**: `query`: string.
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
