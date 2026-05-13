# GVF — Governance Verification Framework

**Status:** v1, **authoritative as of 2026-05-14.** Ratified by the project owner. Any GVF-shaped code (`deepFreeze`, temporal invariants, Silent Channel, `CausalLink`, Panic Model) is interpreted against this spec. The uncommitted GVF code in the main worktree reconciles to v1 in PR #4 (forthcoming).

**Companion documents:** [governance-upcm.md](../governance-upcm.md) (event ownership / runtime contracts), [daemon-protocol.md](../daemon-protocol.md) (host ↔ daemon JSON-RPC), [event-contract.md](./event-contract.md) (canonical topic registry).

**Reading order:** §1 Charter → §2 Constitutional Scope → §5 Runtime Modes → §3 Invariants → rest as needed.

---

## 1. Charter

GVF (**Governance Verification Framework**) is a **runtime verification layer** on top of the existing UPCM (event ownership) and GOS (observability) systems. Where UPCM answers *"who is allowed to emit what?"* and GOS answers *"what happened?"*, GVF answers a different question:

> *"Can the answers from UPCM and GOS be trusted?"*

That trust is established by **four constitutional invariants**, each enforced by runtime machinery, type-system constraints, or both. Violations of these invariants are treated as *substrate-level corruption* — qualitatively different from ordinary application errors.

GVF is deliberately small. It does not expand the surface of governance — it makes the existing surface *physically* (not just logically) guaranteed.

### Foundational Principle

> **Invariants must never exceed substrate truth.**

A constitutional invariant is a promise the substrate can mechanically keep. Promising more than the substrate can deliver — typed surfaces that aren't populated, temporal checks that conflate wall-clock with causality, audit channels that can be spoofed — degrades the framework from law to ceremony. This principle is load-bearing: it determines which invariants ship in v1 (Physical Immutability, Replay Boundaries, Recursion Isolation) and which are deferred (Temporal Consistency — see §3.4).

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

The `emitter !== 'sys'` check is **mandatory constitutional enforcement** — not optional hardening. The Silent Channel is not a convenience optimization; it is a *protected epistemic boundary*. A spoofed emit on `sys/gqi/*` would let a compromised UI or host evade audit, which is exactly the failure mode the channel exists to prevent. Omitting the check compromises the entire epistemic isolation model.

**Why:** Without recursion isolation, introspecting the system mutates the system's own history. Replay determinism cannot survive recursive observation. Examples of legitimate Silent Channel use: querying the trace store for a debug UI, computing `GovernanceStress` metrics, internal health checks.

**GQI** is ratified as **Governance Query Interface**.

### 3.4 Temporal Consistency — DEFERRED

**Status:** **Not enforced at v0.** The current code's wall-clock-based check (`child.timestamp >= TraceStore.getLast().timestamp`) is *removed* from the runtime path until causal parentage is implemented.

**Rationale:** Wall-clock adjacency is not causality. Under concurrent emits across domains (chat streaming `chat/delta` mid-response while the host emits `context/add` on editor switch), two emits with different wall-clock origins can interleave non-monotonically without any causal inversion having occurred. Enforcing wall-clock monotonicity panics on a non-violation — semantically overclaiming.

**Re-introduction conditions:** Temporal Consistency is re-introduced as a *real* invariant once *all three* of the following hold:

1. `CausalLink` is *populated* by runtime lineage construction (not just typed).
2. Causal parents for each trace are *authoritative* (not diagnostic).
3. Replay graph reconstruction is implemented (a trace's causal ancestors can be retrieved deterministically).

The re-introduced invariant is restated as: *"For every causal-parent relation (trace P, trace C), C.timestamp ≥ P.timestamp."* Wall-clock comparison against `TraceStore.getLast()` is **not** the re-introduced check and must not be reused.

Until those three conditions hold, **timestamps are diagnostic, not constitutional.** See §6 for the distinction.

**This deferral is a direct application of the Foundational Principle in §1.** Typed causality is not implemented causality.

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

**The override (`CODESPHERE_GOVERNANCE_STRICT=1`) is no longer a gate; it is a Development-mode escalation.** A developer who wants test-mode strictness in dev sets the flag.

**Production never honors the override.** The override has no effect when `extensionMode === ExtensionMode.Production`. Panics are forbidden in production regardless of any environment variable — this is non-negotiable and follows from the operational-stability commitment of Production mode.

**Test mode is unaffected by the override.** Test mode always panics on constitutional violations; the override neither weakens nor strengthens that.

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

### Resolved at v1

- ✅ **GVF initialism.** Ratified as **Governance Verification Framework**.
- ✅ **GQI initialism.** Ratified as **Governance Query Interface**.
- ✅ **`ExtensionMode` plumbing.** Adopted pattern: `EventBus.configure({ extensionMode, strictOverride })` called once from `activate()`. No hidden globals, no env probing deep in runtime code, no implicit singleton mutation. Mode is set explicitly at the bootstrap boundary and is immutable thereafter. Re-entering `configure()` after the first call is itself a constitutional violation in Test mode.

### Deferred to v0.1 (not blocking PR #4)

- **Performance SLA for `deepFreeze` enforcement.** The "< 0.1 ms per emit" claim in §3.1 is asserted but not measured. A microbenchmark is required before §3.1's performance contract is treated as load-bearing. Until measured, it is diagnostic guidance.
- **Quarantine semantics in Production.** §4 says "log + quarantine + non-fatal." What does *quarantine* mean operationally? Candidate behaviors: trace recorded with `status: 'corrupted'`; subsequent reads filter it out; daemon notified out-of-band. To be specified before the daemon ships (P2).
- **`CausalLink` construction.** Required for §3.4 Temporal Consistency re-introduction. Open: who declares causal parentage — the emitter, the EventBus, or a separate scheduler? To be specified before any temporal-aware feature is built.

## 10. Non-Goals

GVF is explicitly NOT trying to:

- **Replace UPCM.** UPCM owns event ownership and payload validation. GVF verifies UPCM's outputs are trustworthy.
- **Replace GOS.** GOS owns observability (TraceStore, snapshots). GVF makes GOS's records immutable.
- **Provide cryptographic guarantees.** Tamper-evidence is via type system + runtime freezes, not signed hashes. Cryptographic audit is a future P2/P3 concern, not a v0 commitment.
- **Cover daemon-side state.** When the daemon exists, *its* runtime needs its own constitutional layer. GVF v0 governs only the extension host's bus.
- **Define a permissions model.** Who is allowed to *call* the EventBus is out of scope. UPCM defines who is allowed to *emit on a topic*. Those are different and GVF doesn't conflate them.
- **Enforce semantic content correctness.** A `chat/send` payload with `text: 'malicious prompt injection'` is governance-clean. GVF does not adjudicate prompt content.

## 11. Ratification Checklist — closed

All boxes signed as of 2026-05-14. Subsequent changes to v1 follow the §12 revision process.

- [x] §1 Charter — confirmed.
- [x] §2 Constitutional Scope — confirmed.
- [x] GVF initialism — ratified as Governance Verification Framework.
- [x] GQI initialism — ratified as Governance Query Interface.
- [x] §5 mode table — confirmed. `ExtensionMode` mapping authoritative. `CODESPHERE_GOVERNANCE_STRICT=1` is Development-only escalation, never honored in Production.
- [x] §8 migration plan — approved.
- [x] §9 open questions — three resolved, three explicitly deferred to v0.1 with non-blocking status.
- [x] Independent read — owner review affirmed structural coherence and the verification-vs-runtime separation.

## 12. Revision History

| Version | Date | Notes |
|---|---|---|
| v0 (draft) | 2026-05-14 | Initial draft from extracted understanding of uncommitted GVF code. |
| **v1 (authoritative)** | **2026-05-14** | Ratified. GVF / GQI initialisms locked. `ExtensionMode.configure({...})` pattern adopted. `CODESPHERE_GOVERNANCE_STRICT=1` scoped to Development only. Foundational Principle elevated. §13 Bounded Expansion added. §14 Maturity Path added. |

## 13. Bounded Expansion (v1 policy)

GVF v1 is **structurally complete for the substrate's current truth**. Further expansion is *deliberately constrained* until operational hardening catches up to architectural ambition.

### Forbidden until v0.1 review

- **No new governance abstractions.** No additional "frameworks", "constitutions", or "verification layers" introduced.
- **No new runtime layers.** No middleware, no policy engines, no inheritance of the bus into specialized variants.
- **No new constitutional primitives.** The four invariants (3.1–3.4) are the set. Adding a fifth requires a v1.1 amendment with explicit ratification.
- **No speculative replay engine.** Until `CausalLink` is populated authoritatively, no work on replay reconstruction.
- **No AI orchestration substrate built on top of GVF.** The chat / context / daemon paths use GVF; they do not extend it.

### Rationale

Architectural inflation is the failure mode this project is most exposed to right now. Each new abstraction creates a typed surface that *implies* trust without delivering it (see §6 anti-pattern). The discipline of refusing additions, even tempting ones, is itself constitutional work.

The policy ends when one of these is true:

- A specific operational pain point cannot be solved within the existing primitives (force-justified expansion).
- The Maturity Path (§14) is complete and a planned v1.1 broadens scope deliberately.

## 14. Maturity Path

The path from v1 (architecture complete) to operational maturity. Priority order. Each item must complete before the next is started — to enforce the §13 expansion policy.

1. **Reconcile GVF implementation against the spec.** PR #4. The uncommitted code in the main worktree adopts:
   - `EventBus.configure({ extensionMode, strictOverride })` bootstrap pattern.
   - `emitter !== 'sys'` Silent Channel gating.
   - Removal of wall-clock `validateTemporalInvariant` from the runtime path.
   - NON-AUTHORITATIVE markers on `GovernanceStress`, `CausalLink`.
2. **Migrate tests** to the new runtime-mode semantics per §8.2.
3. **Add integration tests** covering UI ↔ EventBus ↔ AiService ↔ ContextService end-to-end. Not just unit tests of governance — flows under realistic event traffic.
4. **Add replay fixtures.** Recorded trace sessions that can be loaded and verified — proves Replay Boundaries (§3.2) under controlled conditions.
5. **Add observability UI.** Surface `TraceStore` and `getSnapshot()` to a developer view (uses Silent Channel for reads).
6. **Profile performance under load.** Microbenchmark `deepFreeze` per-emit cost. Verify the §3.1 SLA empirically. Resolve §9 deferred item.
7. **Validate crash recovery behavior.** What happens when the host process crashes mid-stream? Mid-deepFreeze? With pending unflushed traces?
8. **Run adversarial concurrency tests.** Concurrent emits from multiple domains (chat streaming + context switching + daemon callbacks). Validates that the absence of temporal enforcement (§3.4) doesn't hide silent corruption.

When 1–8 are complete, GVF is operationally mature. At that point, v1.1 amendments (re-introduction of Temporal Consistency, daemon-side constitutional layer, etc.) become reviewable.

---

**v1 is the contract. The code reconciles to this document, not the other way around. Amendments follow §12 revision protocol with explicit ratification.**
