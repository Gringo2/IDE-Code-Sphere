/**
 * GVF §14.4 — Replay fixture schema (v1).
 *
 * A fixture is a constitutional artifact: a hand-authored description of
 * "given this input sequence in this runtime mode, the substrate MUST
 * produce this canonical output." Fixtures live in
 * `src/test/fixtures/replay/*.json` and are loaded by `replay.test.ts`.
 *
 * Schema notes:
 *
 *   - `mode` is required even though only `"test"` is currently runnable.
 *     The split is constitutional (§5): future fixtures will assert
 *     Production quarantine semantics and Development non-throw behavior.
 *     The runner rejects non-`"test"` fixtures in v1 with a clear error.
 *
 *   - `input.length` MAY differ from `expected.length`. Silent-channel
 *     emits (`sys/gqi/*`) and spoofed silent emits produce no trace by
 *     §3.3, so they appear in `input` but not in `expected`.
 *
 *   - `expected[i]` is a SUBSET assertion. Every field declared in
 *     `expected[i]` must match the corresponding canonical trace; extra
 *     fields on the actual trace are tolerated. This lets fixtures bind
 *     to contract-level invariants (topic/emitter/status) without
 *     hand-computing format-internal fields (payloadHash). Run-vs-run
 *     determinism is asserted separately and uses FULL canonical equality
 *     — that is where payloadHash determinism gets checked.
 *
 *   - `expectedGovernanceCalls` lets a fixture assert that
 *     `GovernanceEnforcer.validateEmission` ran exactly N times during
 *     the run. The Silent Channel fixture uses this to prove governance
 *     was NOT evaluated for `sys/gqi/*` emits (§3.3 invariant: bypasses
 *     governance, tracing, AND side-effects).
 *
 *   - `expectedThrows[]` declares which input indices are expected to
 *     throw in Test mode (governance violations). Each entry carries a
 *     regex pattern that the runtime throw message must match.
 */

import type { Domain } from '../../../core/Governance';

export type FixtureMode = 'test' | 'development' | 'production';

export interface FixtureInputEmit {
    /** Event topic, e.g., 'chat/send' or 'sys/gqi/probe'. */
    readonly topic: string;
    /** Source domain emitting the event. */
    readonly emitter: Domain;
    /** Raw payload passed to `globalEventBus.emit(topic, data, emitter)`. */
    readonly data: unknown;
}

export interface FixtureExpectedTrace {
    readonly topic: string;
    readonly emitter: Domain;
    readonly status: 'allowed' | 'blocked';
    /** Optional. If present, must equal the canonical trace's payloadHash. */
    readonly payloadHash?: string;
    /** Optional. If present, must structurally equal causalLinks. */
    readonly causalLinks?: ReadonlyArray<unknown>;
    /** Required when status is 'blocked'. */
    readonly violation?: {
        readonly ruleId: string;
        readonly reasonCode: string;
    };
}

export interface FixtureExpectedThrow {
    /** Index into `input[]` for the emit that is expected to throw. */
    readonly index: number;
    /** Regex pattern (string) that the throw message must match. */
    readonly pattern: string;
}

export interface ReplayFixture {
    readonly name: string;
    readonly description: string;
    readonly mode: FixtureMode;
    readonly input: ReadonlyArray<FixtureInputEmit>;
    readonly expected: ReadonlyArray<FixtureExpectedTrace>;
    readonly expectedGovernanceCalls?: number;
    readonly expectedThrows?: ReadonlyArray<FixtureExpectedThrow>;
}
