/**
 * GVF §14.4 — Replay fixture runner.
 *
 * Plays a fixture's `input` sequence against the live substrate
 * (`globalEventBus`, `TraceStore`, `GovernanceEnforcer`) and returns a
 * canonical `ReplayResult` for comparison.
 *
 * Design principles (§14.4 refinements):
 *
 *   1. Harness adapts to substrate, not the other way (#5). The runner
 *      does NOT call `TraceStore.clear()` (it doesn't exist) and does NOT
 *      reset configuration mid-run. It uses the "slice from last id"
 *      pattern: record the id of the last trace before the run, find it
 *      again afterward, take everything after.
 *
 *   2. Governance call count is observed via temporary monkey-patch on
 *      `GovernanceEnforcer.validateEmission`. The original is restored in
 *      `finally`, so no other test ever sees the patched method. This
 *      satisfies refinement #3: silent-channel fixtures can assert
 *      `expectedGovernanceCalls: 0`, proving §3.3's "bypasses governance,
 *      tracing, AND side-effects" invariant — not just the trace-count
 *      half of it.
 *
 *   3. Throws during emit are caught and recorded as `EmitOutcome.threw`.
 *      In Test mode, governance violations throw AFTER the trace is
 *      pushed to the store (EventBus.emit lines 146-167), so a blocked
 *      emit produces both a trace AND a throw — the runner captures both.
 *
 *   4. Only `mode: "test"` fixtures are runnable in v1. The integration
 *      test host runs in `ExtensionMode.Test`, so other modes would
 *      require a separate harness — deferred. Non-test fixtures throw
 *      `FixtureModeNotSupportedError` with a clear message.
 */

import { globalEventBus } from '../../../core/EventBus';
import { TraceStore } from '../../../core/Observability';
import { GovernanceEnforcer } from '../../../core/Governance';
import { canonicalizeTrace, type EmitOutcome, type ReplayResult } from './canonicalize';
import type { ReplayFixture } from './types';

export class FixtureModeNotSupportedError extends Error {
    constructor(fixtureName: string, mode: string) {
        super(
            `[ReplayFixture] [${fixtureName}] mode '${mode}' is not runnable in the integration test host ` +
            `(which runs in ExtensionMode.Test). v1 only supports mode='test'. ` +
            `Production/Development fixtures will require a separate harness.`
        );
        this.name = 'FixtureModeNotSupportedError';
    }
}

export class TraceBufferEvictedError extends Error {
    constructor(fixtureName: string) {
        super(
            `[ReplayFixture] [${fixtureName}] before-marker trace was evicted from TraceStore during the run. ` +
            `Either the fixture is larger than MAX_TRACES, or pre-existing traces pushed the buffer past its limit. ` +
            `Increase MAX_TRACES, shrink the fixture, or run earlier in the test order.`
        );
        this.name = 'TraceBufferEvictedError';
    }
}

/**
 * Compute the slice of traces produced during this run.
 *
 * Uses the id of the last trace before the run as a marker. After the
 * run, finds that id in `TraceStore` and returns everything after it.
 *
 * If the marker is null (TraceStore was empty before the run), every
 * trace currently in the store is new.
 *
 * If the marker is non-null but can't be found after the run, the
 * circular buffer evicted it mid-run — fail loudly rather than silently
 * mis-attributing pre-existing traces to this run.
 */
function sliceNewTraces(fixtureName: string, beforeMarkerId: string | null) {
    const all = TraceStore.getRecent(10_000);
    if (beforeMarkerId === null) {
        return all;
    }
    const idx = all.findIndex(t => t.id === beforeMarkerId);
    if (idx === -1) {
        throw new TraceBufferEvictedError(fixtureName);
    }
    return all.slice(idx + 1);
}

/**
 * Run one fixture and return its canonical result.
 *
 * Side effects on the substrate:
 *   - Emits each `input[i]` through `globalEventBus`. Allowed emits push
 *     a trace; blocked emits in Test mode push a trace AND throw; silent
 *     emits push nothing.
 *   - Temporarily replaces `GovernanceEnforcer.validateEmission` to count
 *     calls. Always restored before return.
 *
 * Does NOT mutate `TraceStore`, `EventBus` configuration, or any other
 * substrate state outside of normal emit semantics.
 */
export function runFixture(fixture: ReplayFixture): ReplayResult {
    if (fixture.mode !== 'test') {
        throw new FixtureModeNotSupportedError(fixture.name, fixture.mode);
    }

    const beforeMarkerId = TraceStore.getLast()?.id ?? null;

    const originalValidate = GovernanceEnforcer.validateEmission;
    let governanceCalls = 0;
    GovernanceEnforcer.validateEmission = function (...args: Parameters<typeof originalValidate>) {
        governanceCalls += 1;
        return originalValidate.apply(this, args);
    };

    const outcomes: EmitOutcome[] = [];

    try {
        for (const inp of fixture.input) {
            try {
                globalEventBus.emit(inp.topic, inp.data, inp.emitter);
                outcomes.push({ threw: false });
            } catch (err) {
                const throwMessage = err instanceof Error ? err.message : String(err);
                outcomes.push({ threw: true, throwMessage });
            }
        }
    } finally {
        GovernanceEnforcer.validateEmission = originalValidate;
    }

    const newTraces = sliceNewTraces(fixture.name, beforeMarkerId);
    const canonical = newTraces.map(canonicalizeTrace);

    return {
        traces: canonical,
        governanceCalls,
        outcomes,
    };
}
