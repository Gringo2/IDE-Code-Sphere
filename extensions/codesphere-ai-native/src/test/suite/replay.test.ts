/**
 * GVF §14.4 — Replay Boundaries integration test.
 *
 * Drives every fixture in `src/test/fixtures/replay/` through the live
 * substrate inside the integration test host. For each fixture:
 *
 *   1. Validate the fixture shape (structural sanity, fail loud on
 *      malformation — §14.4 refinement #4).
 *   2. Run the fixture once. Compare canonical traces against the
 *      fixture's `expected` using SUBSET MATCHING (every field declared
 *      in expected must match; extra canonical fields are tolerated).
 *   3. Assert `governanceCalls` if the fixture declares
 *      `expectedGovernanceCalls`. This is how the silent-channel fixture
 *      proves §3.3's "bypasses governance" half of the invariant.
 *   4. Assert outcome.threw for every input: matches `expectedThrows` if
 *      declared, otherwise must be `false`. This forces fixtures to be
 *      complete about which emits throw.
 *   5. Run the fixture a SECOND time and deep-equal the full canonical
 *      result against the first run. This is the determinism contract:
 *      payloadHash, causalLinks, and every canonical field must be
 *      structurally identical across runs.
 *
 * Fixtures are loaded from source (`src/test/fixtures/replay/*.json`),
 * not the compiled `out/` tree, because `tsc` does not copy JSON. The
 * path resolution is dev-only — this code never ships to a packaged
 * extension. If §14 ever needs fixtures at runtime, the copy step gets
 * added to `compile-tests` then.
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    canonicalizeReplayResult,
    type CanonicalTrace,
    type ReplayResult,
} from '../fixtures/replay/canonicalize';
import { runFixture } from '../fixtures/replay/fixtureRunner';
import { validateFixtureShape } from '../fixtures/replay/validateFixture';
import type {
    FixtureExpectedThrow,
    FixtureExpectedTrace,
    ReplayFixture,
} from '../fixtures/replay/types';

const EXTENSION_ID = 'codesphere.codesphere-ai-native';
const FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'fixtures', 'replay');

function listFixtureFilenames(): string[] {
    return fs.readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith('.json'))
        .sort();
}

function loadFixture(filename: string): ReplayFixture {
    const full = path.join(FIXTURES_DIR, filename);
    const raw = fs.readFileSync(full, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    validateFixtureShape(parsed);
    return parsed;
}

/**
 * Subset-equality assertion: every field declared in `expected` must
 * deep-equal the corresponding field in `actual`. Extra fields on
 * `actual` are tolerated. This lets fixtures bind to contract-level
 * invariants without hand-computing format-internal values like
 * `payloadHash`.
 */
function expectTraceMatchesExpected(
    fixtureName: string,
    traceIndex: number,
    actual: CanonicalTrace,
    expected: FixtureExpectedTrace
): void {
    for (const [key, expectedValue] of Object.entries(expected)) {
        const actualValue = (actual as unknown as Record<string, unknown>)[key];
        expect(
            actualValue,
            `[${fixtureName}] trace[${traceIndex}].${key} mismatch`
        ).to.deep.equal(expectedValue);
    }
}

describe('GVF §3.2 — Replay Boundaries (fixture-driven determinism)', () => {
    const filenames = listFixtureFilenames();

    before(async () => {
        // Defensive: ensure the bus is in Test mode before any fixture
        // runs. Don't depend on extension.test.ts file-ordering. Calling
        // ext.activate() on an already-active extension is a no-op in
        // the VS Code runtime, so this is safe regardless of which test
        // file loaded first.
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    it('discovered at least one fixture', () => {
        // Sanity gate. If this directory is empty, the suite below
        // becomes a no-op and the constitutional check evaporates.
        expect(filenames.length, 'no fixtures found in src/test/fixtures/replay/').to.be.greaterThan(0);
    });

    for (const filename of filenames) {
        describe(filename, () => {
            let fixture: ReplayFixture;
            let firstResult: ReplayResult;

            before(() => {
                fixture = loadFixture(filename);
                firstResult = canonicalizeReplayResult(runFixture(fixture));
            });

            it('produces the expected canonical traces (subset match)', () => {
                expect(
                    firstResult.traces.length,
                    `[${fixture.name}] expected ${fixture.expected.length} canonical traces, got ${firstResult.traces.length}`
                ).to.equal(fixture.expected.length);

                fixture.expected.forEach((expectedTrace: FixtureExpectedTrace, i: number) => {
                    expectTraceMatchesExpected(fixture.name, i, firstResult.traces[i], expectedTrace);
                });
            });

            it('emit outcomes match expectedThrows (and only those throw)', () => {
                const expectedThrows: ReadonlyArray<FixtureExpectedThrow> = fixture.expectedThrows ?? [];
                const throwingIndices = new Set(expectedThrows.map(t => t.index));

                firstResult.outcomes.forEach((outcome, i) => {
                    if (throwingIndices.has(i)) {
                        const exp = expectedThrows.find(t => t.index === i)!;
                        expect(
                            outcome.threw,
                            `[${fixture.name}] input[${i}] expected to throw`
                        ).to.equal(true);
                        expect(
                            outcome.throwMessage,
                            `[${fixture.name}] input[${i}] throw message must match /${exp.pattern}/`
                        ).to.match(new RegExp(exp.pattern));
                    } else {
                        expect(
                            outcome.threw,
                            `[${fixture.name}] input[${i}] threw unexpectedly: ${outcome.throwMessage ?? ''}`
                        ).to.equal(false);
                    }
                });
            });

            it('governance evaluation count matches fixture expectation', () => {
                if (typeof fixture.expectedGovernanceCalls !== 'number') {
                    // No assertion declared. Skip without failing.
                    return;
                }
                expect(
                    firstResult.governanceCalls,
                    `[${fixture.name}] expected ${fixture.expectedGovernanceCalls} governance calls, got ${firstResult.governanceCalls}`
                ).to.equal(fixture.expectedGovernanceCalls);
            });

            it('determinism: a second run produces a structurally identical canonical result', () => {
                const secondResult = canonicalizeReplayResult(runFixture(fixture));

                // Full canonical equality — this is where payloadHash
                // determinism gets asserted across runs. If something in
                // the substrate accumulated hidden state, the second
                // run's traces would diverge.
                expect(
                    secondResult.traces,
                    `[${fixture.name}] run-2 canonical traces must equal run-1`
                ).to.deep.equal(firstResult.traces);

                expect(
                    secondResult.governanceCalls,
                    `[${fixture.name}] run-2 governance call count must equal run-1`
                ).to.equal(firstResult.governanceCalls);

                expect(
                    secondResult.outcomes,
                    `[${fixture.name}] run-2 emit outcomes must equal run-1`
                ).to.deep.equal(firstResult.outcomes);
            });
        });
    }
});
