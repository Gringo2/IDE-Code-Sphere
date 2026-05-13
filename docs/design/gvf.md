# GVF — Governance Verification Framework

**Status:** v0 draft, **pending ratification.** Not authoritative until the project owner signs §1 and §2. Until then, any GVF-shaped code (deepFreeze, temporal invariants, Silent Channel, CausalLink, Panic Model) is interpreted against *this draft*, not against the merged code on `feature/ai-native-core`. When ratified, the code reconciles to this spec — not the other way around.

**Companion documents:** [governance-upcm.md](../governance-upcm.md) (event ownership / runtime contracts), [daemon-protocol.md](../daemon-protocol.md) (host ↔ daemon JSON-RPC), [event-contract.md](./event-contract.md) (canonical topic registry).

**Reading order:** §1 Charter → §2 Constitutional Scope → §5 Runtime Modes → §3 Invariants → rest as needed.

---

## 1. Charter

GVF is a **runtime verification layer** on top of the existing UPCM (event ownership) and GOS (observability) systems. Where UPCM answers *"who is allowed to emit what?"* and GOS answers *"what happened?"*, GVF answers a different question:

> *"Can the answers from UPCM and GOS be trusted?"*

That trust is established by **four constitutional invariants**, each enforced by runtime machinery, type-system constraints, or both. Violations of these invariants are treated as *substrate-level corruption* — qualitatively different from ordinary application errors.

GVF is deliberately small. It does not expand the surface of governance — it makes the existing surface *physically* (not just logically) guaranteed.

## 2. Constitutional Scope

### 2.1 GVF governs

- **Trace integrity.** Once a trace enters the TraceStore, it cannot be mutated. Once causal links are recorded, they cannot be rewritten.
- **Replay determinism.** A recorded session can be replayed and produce identical traces, in identical order, with identical causality.
- **Governance verification.** UPCM's decisions (allowed / blocked) are themselves recorded and tamper-evident.
- **Recursion isolation.** Introspection of the system does not pollute the system's own history.

### 2.2 GVF does NOT govern

- **Business logic correctness.** Whether the chat assistant gives a useful answer is outside scope.
- **UX correctness.** Whether the Stop button is visible, whether markdown renders, whether the consent modal copy is acceptable — none of this is constitutional.
- **Daemon intelligence quality.** Model selection, prompt engineering, context relevance — outside scope.
- **Semantic reasoning accuracy.** Whether `context/add` items are *the right items* is not a GVF concern. That they cannot be silently rewritten *is*.

This boundary is load-bearing. Scope creep into application semantics turns GVF from a verification layer into an opinionated framework, which would make the project harder to evolve.

## 3. The Four Invariants

### 3.1 Physical Immutability

**Statement:** Every `EventTrace`, `CausalLink`, and `GovernanceViolation` is immutable after finalization. Mutation attempts at any level of nesting raise `TypeError` at runtime and are rejected at compile time.

**Mechanism:**
- All fields declared `readonly` (compile-time).
- `deepFreeze()` applied recursively to the trace and its `causalLinks` array before insertion into `TraceStore` (runtime).
- `TraceStore.push` rejects any trace where `Object.isFrozen(trace) === false` with `"[TraceStore] Constitutional Violation: Attempted to push un-frozen trace."`

**Why:** A historical record that can be rewritten is not a record. Replay determinism is impossible without immutability.

**Performance contract:** `deepFreeze` runs on every emit. Its cost is bounded by the size of the trace object (≤ 8 keys + bounded `causalLinks` array). Payload content is not deep-frozen — only the payload *hash* is recorded. Performance budget: **< 0.1 ms per emit** on a modern machine. Violation of this budget is itself an open question (see §9).

### 3.2 Replay Boundaries

**Statement:** Recorded history is partitioned into explicit, authoritative segments. A consumer can ask "what was the state at trace N?" and get a deterministic answer.

**Mechanism:**
- `TraceStore` is a bounded circular buffer (MAX_TRACES = 1000 in current code).
- Boundaries are explicit: a trace is either in the buffer or evicted. There is no "maybe" state.
- (Future:) `CausalLink` typed edges (`triggered` / `blocked-by` / `derived-from`) provide structured causal lineage between traces.

**Why:** Without replay boundaries, the audit log degrades into vibes. With them, "this happened" becomes a checkable claim.

### 3.3 Recursion Isolation (Silent Channel)

**Statement:** A protected topic prefix — currently `sys/gqi/*` — bypasses governance, tracing, and side-effects entirely. Only the system itself (`emitter === 'sys'`) may emit on it.

**Mechanism:**
```ts
if (topic.startsWith('sys/gqi/')) {
    if (emitter !== 'sys') {
        return false;   // spoofing attempt — reject
    }
    return super.emit(topic, data);
}
```

The `emitter !== 'sys'` check is **mandatory**. The Silent Channel is not a convenience optimization — it is a *protected epistemic boundary*. A spoofed emit on `sys/gqi/*` would let a compromised UI or host evade audit, which is exactly the failure mode the channel exists to prevent.

**Why:** Without recursion isolation, introspecting the system mutates the system's own history. Replay determinism cannot survive recursive observation. Examples of legitimate Silent Channel use: querying the trace store for a debug UI, computing `GovernanceStress` metrics, internal health checks.

**GQI** is provisionally interpreted as "Governance Query Interface." The spec ratifies the term in §11.

### 3.4 Temporal Consistency — DEFERRED

**Status:** **Not enforced at v0.** The current code's wall-clock-based check (`child.timestamp >= TraceStore.getLast().timestamp`) is *removed* from the runtime path until causal parentage is implemented.

**Rationale:** Wall-clock adjacency is not causality. Under concurrent emits across domains (chat streaming `chat/delta` mid-response while the host emits `context/add` on editor switch), two emits with different wall-clock origins can interleave non-monotonically without any causal inversion having occurred. Enforcing wall-clock monotonicity panics on a non-violation — semantically overclaiming.

**Re-introduction conditions:** Temporal Consistency is re-introduced as a *real* invariant once:

1. `CausalLink` is *populated* by runtime lineage construction (not just typed).
2. A causal parent for each trace is identifiable from `causalLinks`.
3. The invariant restated as: *"For every causal-parent relation (trace P, trace C), C.timestamp ≥ P.timestamp."*

Until then, temporal ordering is *diagnostic*, not authoritative. See §6 for what that distinction means.

**Principle:** *Invariants must never exceed substrate truth.* Typed causality is not implemented causality.

## 4. Failure Taxonomy

Two categories. They behave differently and are reported differently.

| | Constitutional Violation | Operational Failure |
|---|---|---|
| **Examples** | Mutation attempt on frozen trace, spoofed Silent Channel emit, replay divergence, future temporal inversion against a real causal graph | OpenRouter timeout, daemon disconnect, malformed payload, indexing failure, network partition |
| **Origin** | Substrate corruption | Environment friction |
| **Recovery** | None — the corruption is unrecoverable in principle | Bounded — retry, fallback, surface to user |
| **In Production mode** | Logged + quarantined + non-fatal (the IDE survives) | Reported to the user / caller as normal errors |
| **In Development mode** | Optionally thrown via `CODESPHERE_GOVERNANCE_STRICT=1` override | Reported normally |
| **In Test mode (CI)** | Hard panic, test fails | Reported normally — does not panic |
| **Trace status** | `status: 'corrupted'` (new value, reserved) | `status: 'blocked'` if rejected by UPCM, `status: 'allowed'` if execution failed downstream |

The taxonomy matters because confusing these two categories has cost both ways:

- Treating an operational failure as constitutional → unnecessary panics, IDE crashes on a flaky network.
- Treating a constitutional violation as operational → the substrate silently corrupts, replay determinism is lost, audit becomes unreliable.

## 5. Runtime Modes

Three modes. The mode is detected via `vscode.ExtensionContext.extensionMode`, not via `NODE_ENV`. `NODE_ENV` is unreliable in VS Code's extension host ecosystem; `ExtensionMode` is platform-native.

| Mode | Detected via | Constitutional violation → | Operational failure → | Notes |
|---|---|---|---|---|
| **Production** | `ExtensionMode.Production` | Log + quarantine + return false | Surface to user | The IDE *must* survive. Default for packaged extensions. |
| **Development** | `ExtensionMode.Development` | Log + return false. Override via `CODESPHERE_GOVERNANCE_STRICT=1` → throw | Surface to user | The developer is at the keyboard. Throws are opt-in. |
| **Test** | `ExtensionMode.Test` | **Panic.** Hard throw. | Surface normally | This is the only mode where constitutional verification is *load-bearing*. CI runs here. |

**Why this separation:** Constitutional enforcement and operational survivability are independent concerns. In production, the IDE matters more than the audit log. In test, the audit log *is* the contract being verified. Development is the deliberate middle ground.

**The override (`CODESPHERE_GOVERNANCE_STRICT=1`) is no longer a gate; it is an opt-in upgrade.** A developer who wants test-mode strictness in dev sets the flag. The flag does nothing in production (panics are still forbidden there).

## 6. Authoritative vs Diagnostic Systems

Distinct categories within GVF. Crossing the boundary requires deliberate promotion.

| Authoritative | Diagnostic |
|---|---|
| **Load-bearing on replay determinism.** Changes here are constitutional migrations. | **Decorative or observational.** Changes do not affect replay or audit guarantees. |
| `TraceStore` insertion + immutability | `getSnapshot()` uptime, recentViolations counts |
| `EventRegistry` (UPCM contracts) | `GovernanceStress` metrics |
| Silent Channel emitter gating | Trace-viewer UI |
| `CausalLink` once populated | `CausalLink` while *only typed* |
| `validateEmission` decisions | Console log lines |

**Rule:** Any field, function, or behavior is **diagnostic by default**. Promotion to authoritative requires:

1. A statement in this spec naming it.
2. Tests in `__tests__/governance/invariants.test.ts` proving its semantics.
3. A migration note if the promotion changes prior code's behavior.

**Anti-pattern:** Allowing a typed-but-unimplemented surface to imply guarantee. The current `GovernanceStress` and pre-population `CausalLink` are typed but not authoritative. They must carry an explicit marker:

```ts
/**
 * NON-AUTHORITATIVE: Diagnostic scaffolding only.
 * Not yet populated by runtime lineage construction.
 * See docs/design/gvf.md §6.
 */
export interface CausalLink { ... }
```

The same applies to `GovernanceStress` until it has a populator.

## 7. The Silent Channel

Already defined as Invariant 3.3. This section is the operational reference.

### 7.1 Topic prefix

Reserved: `sys/gqi/*`. No other domain may register topics under this prefix. The UPCM `EventRegistry` should NOT carry contracts for `sys/gqi/*` topics — they're outside governance.

### 7.2 Permitted emitters

Only `emitter === 'sys'`. This is checked at the bypass site (before the bypass takes effect, to prevent spoofing).

### 7.3 Permitted callers

`sys` is a logical identity, not an authenticated one in v0. Anyone with code-level access can emit as `sys`. This is acceptable because:

- All code in the extension host is trusted (same security boundary).
- The threat model excludes attackers who can already run code in the extension host.

When the daemon lands (P2), the daemon's emit-as-sys path must be authenticated at the transport boundary, not at the bus boundary.

### 7.4 Use cases

- **Trace queries** (debug UI fetching recent traces without recording the fetch itself).
- **Stress metrics** (computing `GovernanceStress` over a window without polluting the window with the computation event).
- **Health probes** (daemon liveness checks).

### 7.5 Forbidden uses

- Any topic that crosses a domain boundary other than `sys`.
- Any topic that should be auditable.
- Any topic that participates in causal chains. (Silent Channel events have no `causalLinks`.)

## 8. Migration Plan from P0-3

The merged code on `feature/ai-native-core` (commit `b9abe1b`) gated UPCM violation throws behind `CODESPHERE_GOVERNANCE_STRICT=1`. The uncommitted GVF code in the main worktree reverts that gate to `NODE_ENV !== 'production'` and adds new invariant-violation throws.

This spec resolves the conflict as follows.

### 8.1 What changes in EventBus.ts

- The strict-mode gate moves from env-var to `ExtensionMode`-based mode detection.
- The env var (`CODESPHERE_GOVERNANCE_STRICT=1`) becomes an **override that upgrades Development → Test-equivalent strictness for UPCM violations only**. It does NOT upgrade Production to Test (those are guarded separately).
- New invariant-violation paths (deepFreeze failure, frozen-trace insertion check, future temporal check) follow the §5 mode table — non-fatal in Production, optionally fatal in Development under the override, always fatal in Test.

### 8.2 What changes in the tests

`__tests__/EventBus.test.ts` cases must be updated:

| Existing test | New form |
|---|---|
| "should return false on unauthorized emission by default" | Same, but set `mode = Production` in test setup. |
| "should throw on unauthorized emission when strict mode is enabled" | Set `mode = Test` (or `mode = Development` with override env var). Both should throw. |

`__tests__/governance/invariants.test.ts` already runs in test mode by default (mocha + ts-node + no explicit `ExtensionMode.Production`). These tests assume Test mode semantics, which is correct.

### 8.3 What stays

- The `CODESPHERE_GOVERNANCE_STRICT` env var as the *override knob* for developers.
- All existing UPCM contracts (`EventRegistry`).
- The `GovernanceEnforcer.validateEmission` decision logic.
- The 5-phase `EventBus.emit` flow (Silent Channel bypass → trace intent → governance decision → constitutional finalization → authoritative execution).

### 8.4 What the GVF code change must add before merge

- `ExtensionMode` plumbing into the EventBus (the singleton has no `ExtensionContext` reference today — passing it in is a non-trivial wiring change).
- `emitter !== 'sys'` check at the Silent Channel bypass.
- Removal of the wall-clock `validateTemporalInvariant` from the runtime path (per §3.4).
- NON-AUTHORITATIVE markers on `CausalLink`, `GovernanceStress`.
- Test migration per §8.2.

## 9. Open Questions

1. **`ExtensionMode` plumbing.** The `EventBus` is a singleton (`getInstance()`). It has no `ExtensionContext` reference. Options: pass `extensionMode` at first use; expose `EventBus.configure(mode)` called from `activate()`; or store mode in a sibling module. Decision: TBD.
2. **Performance SLA for `deepFreeze` enforcement.** The "< 0.1 ms per emit" claim in §3.1 is asserted but not measured. Need a microbenchmark before relying on it.
3. **Quarantine semantics in Production.** §4 says "log + quarantine + non-fatal." What does *quarantine* mean operationally? Options: trace is recorded with `status: 'corrupted'`; subsequent reads filter it out; daemon is notified out-of-band. Decision: TBD.
4. **`CausalLink` construction.** Required for §3.4 re-introduction. Open: who is responsible for declaring causal parentage — the emitter, the EventBus, or a separate scheduler?
5. **GQI initialism.** Provisionally "Governance Query Interface." Ratify or revise in §11.
6. **GVF initialism.** Provisionally "Governance Verification Framework." Ratify or revise in §11.

## 10. Non-Goals

GVF is explicitly NOT trying to:

- **Replace UPCM.** UPCM owns event ownership and payload validation. GVF verifies UPCM's outputs are trustworthy.
- **Replace GOS.** GOS owns observability (TraceStore, snapshots). GVF makes GOS's records immutable.
- **Provide cryptographic guarantees.** Tamper-evidence is via type system + runtime freezes, not signed hashes. Cryptographic audit is a future P2/P3 concern, not a v0 commitment.
- **Cover daemon-side state.** When the daemon exists, *its* runtime needs its own constitutional layer. GVF v0 governs only the extension host's bus.
- **Define a permissions model.** Who is allowed to *call* the EventBus is out of scope. UPCM defines who is allowed to *emit on a topic*. Those are different and GVF doesn't conflate them.
- **Enforce semantic content correctness.** A `chat/send` payload with `text: 'malicious prompt injection'` is governance-clean. GVF does not adjudicate prompt content.

## 11. Ratification Checklist

Before this draft becomes v1 (authoritative):

- [ ] §1 Charter reviewed and rewritten in the project owner's voice.
- [ ] §2 Constitutional Scope confirmed — additions / removals.
- [ ] GVF initialism ratified (currently provisional: "Governance Verification Framework").
- [ ] GQI initialism ratified (currently provisional: "Governance Query Interface").
- [ ] §5 mode table confirmed — `ExtensionMode` mapping, override semantics.
- [ ] §8 migration plan approved as the path forward for the conflicting code.
- [ ] §9 open questions assigned owners or explicitly deferred to v0.1.
- [ ] At least one tester unrelated to authorship has read the spec end-to-end and confirms it reads as a coherent document, not as scaffolding.

## 12. Revision History

| Version | Date | Notes |
|---|---|---|
| v0 (draft) | 2026-05-14 | Initial draft from extracted understanding of uncommitted GVF code. Pending owner ratification. |

---

**Until §11 is signed off, treat this spec as a proposal, not a contract. The code on `feature/ai-native-core` is the operational reality; this document is the destination.**
