/**
 * GVF §14.4 — Replay fixture structural validator.
 *
 * Replay fixtures are constitutional artifacts (§14.4 refinement #4):
 * malformed fixtures must fail loudly and deterministically BEFORE the
 * substrate is touched, not partially-execute and produce confusing
 * diffs against the canonical output. This validator is the gate.
 *
 * Lightweight by design: no Zod, no schema-as-data. Just structural
 * checks that produce specific, actionable error messages naming the
 * fixture and the failing field path. If the fixture surface ever grows
 * past hand-maintainable, swap this for Zod — but until then the
 * validator's transparency is more valuable than its conciseness.
 */

import type {
    FixtureExpectedThrow,
    FixtureExpectedTrace,
    FixtureInputEmit,
    FixtureMode,
    ReplayFixture,
} from './types';

const VALID_MODES: readonly FixtureMode[] = ['test', 'development', 'production'];
const VALID_STATUSES = ['allowed', 'blocked'] as const;
const VALID_EMITTERS = ['chat', 'context', 'sys', 'ui', 'host'] as const;

export class FixtureValidationError extends Error {
    constructor(message: string) {
        super(`[ReplayFixture] ${message}`);
        this.name = 'FixtureValidationError';
    }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateInput(name: string, value: unknown, index: number): asserts value is FixtureInputEmit {
    if (!isPlainObject(value)) {
        throw new FixtureValidationError(`[${name}] input[${index}] must be an object`);
    }
    if (typeof value.topic !== 'string' || value.topic.length === 0) {
        throw new FixtureValidationError(`[${name}] input[${index}].topic must be a non-empty string`);
    }
    if (typeof value.emitter !== 'string' || !(VALID_EMITTERS as readonly string[]).includes(value.emitter)) {
        throw new FixtureValidationError(
            `[${name}] input[${index}].emitter must be one of: ${VALID_EMITTERS.join(', ')} (got: ${String(value.emitter)})`
        );
    }
    if (!('data' in value)) {
        throw new FixtureValidationError(`[${name}] input[${index}].data is required (use {} for empty payload)`);
    }
}

function validateExpectedTrace(name: string, value: unknown, index: number): asserts value is FixtureExpectedTrace {
    if (!isPlainObject(value)) {
        throw new FixtureValidationError(`[${name}] expected[${index}] must be an object`);
    }
    if (typeof value.topic !== 'string' || value.topic.length === 0) {
        throw new FixtureValidationError(`[${name}] expected[${index}].topic must be a non-empty string`);
    }
    if (typeof value.emitter !== 'string' || !(VALID_EMITTERS as readonly string[]).includes(value.emitter)) {
        throw new FixtureValidationError(
            `[${name}] expected[${index}].emitter must be one of: ${VALID_EMITTERS.join(', ')} (got: ${String(value.emitter)})`
        );
    }
    if (typeof value.status !== 'string' || !(VALID_STATUSES as readonly string[]).includes(value.status)) {
        throw new FixtureValidationError(
            `[${name}] expected[${index}].status must be one of: ${VALID_STATUSES.join(', ')} (got: ${String(value.status)})`
        );
    }
    if ('payloadHash' in value && typeof value.payloadHash !== 'string') {
        throw new FixtureValidationError(`[${name}] expected[${index}].payloadHash, if present, must be a string`);
    }
    if ('causalLinks' in value && !Array.isArray(value.causalLinks)) {
        throw new FixtureValidationError(`[${name}] expected[${index}].causalLinks, if present, must be an array`);
    }
    if (value.status === 'blocked') {
        if (!isPlainObject(value.violation)) {
            throw new FixtureValidationError(
                `[${name}] expected[${index}].violation is required when status is 'blocked'`
            );
        }
        if (typeof value.violation.ruleId !== 'string' || typeof value.violation.reasonCode !== 'string') {
            throw new FixtureValidationError(
                `[${name}] expected[${index}].violation must have string ruleId and reasonCode`
            );
        }
    }
}

function validateExpectedThrow(name: string, value: unknown, index: number, inputLen: number): asserts value is FixtureExpectedThrow {
    if (!isPlainObject(value)) {
        throw new FixtureValidationError(`[${name}] expectedThrows[${index}] must be an object`);
    }
    if (typeof value.index !== 'number' || !Number.isInteger(value.index) || value.index < 0 || value.index >= inputLen) {
        throw new FixtureValidationError(
            `[${name}] expectedThrows[${index}].index must be an integer in [0, ${inputLen}) (got: ${String(value.index)})`
        );
    }
    if (typeof value.pattern !== 'string' || value.pattern.length === 0) {
        throw new FixtureValidationError(`[${name}] expectedThrows[${index}].pattern must be a non-empty string`);
    }
    try {
        new RegExp(value.pattern);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new FixtureValidationError(`[${name}] expectedThrows[${index}].pattern is not a valid regex: ${msg}`);
    }
}

/**
 * Validate the shape of an unknown JSON value as a ReplayFixture.
 *
 * Throws `FixtureValidationError` with a specific path on any malformation.
 * Returns nothing on success; the type-narrowing predicate `asserts value
 * is ReplayFixture` makes downstream code see the value as fully typed.
 */
export function validateFixtureShape(value: unknown): asserts value is ReplayFixture {
    if (!isPlainObject(value)) {
        throw new FixtureValidationError('fixture root must be a JSON object');
    }
    if (typeof value.name !== 'string' || value.name.length === 0) {
        throw new FixtureValidationError('fixture.name must be a non-empty string');
    }
    const name = value.name;
    if (typeof value.description !== 'string') {
        throw new FixtureValidationError(`[${name}] fixture.description must be a string`);
    }
    if (typeof value.mode !== 'string' || !(VALID_MODES as readonly string[]).includes(value.mode)) {
        throw new FixtureValidationError(
            `[${name}] fixture.mode must be one of: ${VALID_MODES.join(', ')} (got: ${String(value.mode)})`
        );
    }
    const input = value.input;
    if (!Array.isArray(input)) {
        throw new FixtureValidationError(`[${name}] fixture.input must be an array`);
    }
    if (input.length === 0) {
        throw new FixtureValidationError(`[${name}] fixture.input must contain at least one emit (empty fixtures are meaningless)`);
    }
    const expected = value.expected;
    if (!Array.isArray(expected)) {
        throw new FixtureValidationError(`[${name}] fixture.expected must be an array`);
    }

    input.forEach((item, i) => validateInput(name, item, i));
    expected.forEach((item, i) => validateExpectedTrace(name, item, i));

    if ('expectedGovernanceCalls' in value) {
        const v = value.expectedGovernanceCalls;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
            throw new FixtureValidationError(
                `[${name}] fixture.expectedGovernanceCalls, if present, must be a non-negative integer (got: ${String(v)})`
            );
        }
    }

    if ('expectedThrows' in value) {
        const expectedThrows = value.expectedThrows;
        if (!Array.isArray(expectedThrows)) {
            throw new FixtureValidationError(`[${name}] fixture.expectedThrows, if present, must be an array`);
        }
        expectedThrows.forEach((item, i) => validateExpectedThrow(name, item, i, input.length));
    }
}
