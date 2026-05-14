/**
 * GVF §14.4 — Replay canonicalization (centralized constitutional boundary).
 *
 * Canonicalization is the test-side line between AUTHORITATIVE trace fields
 * (must be deterministic given the same input sequence) and NON-AUTHORITATIVE
 * fields (runtime-allocated IDs, wall-clock timestamps).
 *
 * It exists so that "replay determinism" has a SINGLE explicit definition.
 * As GVF evolves — when duration, memory pressure, scheduler hints, or replay
 * metadata become authoritative output — the change happens HERE, not in
 * every test. Tests must never inline `delete trace.id` style mutations;
 * always route through `canonicalizeTrace`.
 *
 * Per §13 Bounded Expansion: this canonicalizer does NOT reconstruct
 * causality. It strips runtime-only identifiers and nothing else.
 * `causalLinks` remains an empty array per §3.4 deferral.
 */

import type { EventTrace, GovernanceViolation } from '../../../core/Observability';

/**
 * The authoritative output of an emit, for replay-determinism purposes.
 *
 * This is the v1 boundary: same input sequence in same runtime mode MUST
 * produce identical `CanonicalTrace[]`. Adding a field here means promoting
 * it from diagnostic to authoritative — that is a constitutional change
 * and should be reviewed against §3 and §6.
 */
export interface CanonicalTrace {
    readonly topic: string;
    readonly emitter: string;
    readonly status: 'allowed' | 'blocked';
    /**
     * Deterministic-but-format-internal hash of the payload. Present in
     * canonical output so run-vs-run determinism can be asserted across the
     * full trace shape. Fixture `expected[i]` MAY omit this — see
     * `traceMatchesExpected` in the runner.
     */
    readonly payloadHash: string;
    readonly causalLinks: ReadonlyArray<unknown>;
    readonly violation?: {
        readonly ruleId: string;
        readonly reasonCode: string;
    };
}

/**
 * Outcome of one emit during a fixture run.
 *
 * `threw` distinguishes the two ways an emit can complete in Test mode:
 *   - `false`: emit returned normally (allowed, or blocked-without-throw
 *     which cannot happen in Test mode but can in Production mode).
 *   - `true`: emit threw because mode is Test/strict-Development and the
 *     emit was blocked. `throwMessage` carries the runtime message for
 *     regex-pattern assertion in the fixture.
 */
export interface EmitOutcome {
    readonly threw: boolean;
    readonly throwMessage?: string;
}

/**
 * Aggregate result of running one fixture.
 *
 * All fields are authoritative outputs for replay-determinism purposes:
 * a second identical run MUST produce a structurally equal `ReplayResult`.
 */
export interface ReplayResult {
    readonly traces: CanonicalTrace[];
    readonly governanceCalls: number;
    readonly outcomes: EmitOutcome[];
}

/**
 * Strip runtime-only identifiers from a single trace, preserving every
 * field that is authoritative for replay determinism.
 *
 * Drops: `id` (random), `timestamp` (wall-clock).
 * Keeps:  `topic`, `emitter`, `status`, `payloadHash`, `causalLinks`,
 *         `violation.ruleId`, `violation.reasonCode`.
 *
 * The `violation.message` and `violation.domain` fields are intentionally
 * dropped: `message` contains topic-name interpolation that is technically
 * deterministic but brittle to spec wording; `domain` always equals the
 * `emitter` already in the trace. `ruleId` + `reasonCode` is the
 * constitutional invariant we care about.
 */
export function canonicalizeTrace(trace: EventTrace): CanonicalTrace {
    const canonical: CanonicalTrace & { violation?: { ruleId: string; reasonCode: string } } = {
        topic: trace.topic,
        emitter: trace.emitter,
        status: trace.status as 'allowed' | 'blocked',
        payloadHash: trace.payloadHash,
        causalLinks: trace.causalLinks,
    };
    if (trace.status === 'blocked' && trace.violation) {
        const v: GovernanceViolation = trace.violation;
        canonical.violation = {
            ruleId: v.ruleId,
            reasonCode: v.reasonCode,
        };
    }
    return canonical;
}

/**
 * Normalize a full replay result before equality comparison.
 *
 * Currently an identity transform: `traces` are already canonical (caller
 * fed each through `canonicalizeTrace`), and `governanceCalls` / `outcomes`
 * are scalar / structurally simple. Exists as a stable insertion point for
 * future authoritative-output additions (e.g., normalized duration
 * histograms, replay-metadata digests). Updating the canonicalization
 * boundary happens here.
 */
export function canonicalizeReplayResult(result: ReplayResult): ReplayResult {
    return result;
}
