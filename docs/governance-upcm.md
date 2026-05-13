# CodeSphere Unified Platform Contract Model (UPCM)

## 1. The Constitutional Mandate
The UPCM is the single source of truth for all **System Governance**. It defines the constraints under which the CodeSphere platform operates. 

## 2. Capability-Based Runtime Contract
Instead of binary versions, CodeSphere runtimes (UI, Host, Daemon) interact via a **Capability Contract**.

### `RuntimeContract`
```typescript
interface RuntimeContract {
  protocolVersion: string;
  identity: {
    name: string;
    role: 'host' | 'daemon' | 'ui';
  };
  capabilities: {
    chat: 'none' | 'basic' | 'streaming';
    indexing: 'none' | 'deterministic' | 'full';
    terminal: 'read' | 'read-write' | 'none';
  };
}
```

## 3. Event Ownership & Contract Rules
The Event Bus is a **Strictly Constrained Space**.

- **Domain Ownership**: Each event must be owned by a single domain.
- **Emission Policy**: A domain can only emit events it owns.
- **Subscription Policy**: Domains can subscribe to **Public** events of other domains. Internal events are strictly forbidden for cross-domain access.

## 4. Patch Dependency Graph
Patches are no longer ordered files; they are nodes in a **Directed Acyclic Graph (DAG)**.

### `PatchDescriptor`
```typescript
interface PatchDescriptor {
  id: string;
  class: 'core' | 'branding' | 'feat' | 'ai';
  dependencies: string[]; // IDs of patches that MUST precede this
  conflicts: string[];     // IDs of patches that cannot coexist
  affects: string[];      // File glob patterns
}
```

## 5. Governance Enforcement Modes
1. **Compile-Time**: Strict TypeScript types for all Event Names and Payloads.
2. **Runtime**: Zod-based validation of all Event Bus traffic. Every violation is logged and the offending emission returns `false`. Strict-mode throws are opt-in via the `CODESPHERE_GOVERNANCE_STRICT=1` environment variable, set by tests and dev tooling. The flag is unset by default in packaged builds so a single misrouted event cannot crash extension activation.
3. **Build-Time**: Dependency validation of the Patch Graph in `prepare_vscode.sh`. Currently skipped at MVP — re-enabled once per-patch `.patch.json` descriptors and `ts-node` at the repo root are in place.

## 6. The Negotiation Protocol
All sessions MUST begin with a bidirectional handshake:
1. `sys/negotiate_req`: Initiator proposes their supported contract.
2. `sys/negotiate_res`: Receiver responds with the intersection of capabilities.
3. **Session Established**: Both sides operate within the negotiated limits.
