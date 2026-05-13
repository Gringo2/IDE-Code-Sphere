import { EventEmitter } from 'events';
import { GovernanceEnforcer, Domain } from './Governance';
import { ObservabilityService, EventTrace } from './Observability';

export type EventCallback<T = any> = (data: T) => void;

/**
 * Runtime mode per docs/design/gvf.md §5.
 * Numeric values mirror vscode.ExtensionMode so a caller may pass
 * context.extensionMode directly through a structural cast.
 */
export enum RuntimeMode {
    Production = 1,
    Development = 2,
    Test = 3
}

export interface EventBusConfig {
    readonly mode: RuntimeMode;
    readonly strictOverride?: boolean;
}

/**
 * CodeSphere Global Event Bus.
 * Unified transport for UI ↔ Host ↔ Daemon.
 * Enforced by UPCM Governance and GVF Constitutional Verification.
 */
export class EventBus extends EventEmitter {
    private static _instance: EventBus;
    private static _mode: RuntimeMode = RuntimeMode.Production;
    private static _strictOverride = false;
    private static _configured = false;

    private constructor() {
        super();
        this.setMaxListeners(100);
    }

    public static getInstance(): EventBus {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    /**
     * Bootstrap-boundary configuration of the bus, per GVF v1 §5 and §9.
     *
     * Called once from extension.activate() with the host's ExtensionMode.
     * Re-entry after first call is forbidden in Test mode (constitutional
     * violation — replay determinism cannot survive mid-session mode flips).
     * In Production / Development, re-entry is a no-op-with-warning so
     * dev-mode hot reloads don't blow up.
     *
     * Default (if configure() is never called) is Production — the safest
     * mode, where panics are forbidden regardless of any other signal.
     */
    public static configure(config: EventBusConfig): void {
        if (EventBus._configured) {
            const isTest = EventBus._mode === RuntimeMode.Test || config.mode === RuntimeMode.Test;
            if (isTest) {
                throw new Error('[EventBus] Constitutional Violation: configure() called more than once (Test mode forbids re-entry).');
            }
            console.warn('[EventBus] configure() called more than once; ignoring re-configuration.');
            return;
        }
        EventBus._mode = config.mode;
        EventBus._strictOverride = config.strictOverride ?? false;
        EventBus._configured = true;
    }

    /** Test-only helper: resets the configuration flag so beforeEach can reconfigure. */
    public static _resetConfigForTests(): void {
        EventBus._mode = RuntimeMode.Production;
        EventBus._strictOverride = false;
        EventBus._configured = false;
    }

    /**
     * Mode-aware violation dispatch per §5:
     *   - Production:               never throw
     *   - Development:              throw iff strictOverride is set
     *   - Test:                     always throw
     */
    private static _shouldThrowOnViolation(): boolean {
        switch (EventBus._mode) {
            case RuntimeMode.Test:
                return true;
            case RuntimeMode.Development:
                return EventBus._strictOverride;
            case RuntimeMode.Production:
            default:
                return false;
        }
    }

    /**
     * Emits an event with authoritative governance and physical immutability guarantees.
     * Five-phase pipeline:
     *   1. Silent Channel bypass (sys/gqi/*) — system-only, no trace, no governance
     *   2. Trace intent creation
     *   3. UPCM governance decision (validateEmission)
     *   4. Constitutional finalization (logEvent — may panic on invariant violation)
     *   5. Authoritative execution (super.emit if allowed)
     */
    public emit(topic: string, data: any, emitter: Domain = 'sys'): boolean {
        // 1. Silent Channel bypass.
        // GQI (Governance Query Interface) channel — system-only. Spoofing
        // attempts are rejected so the audit channel cannot be evaded by a
        // compromised UI/host. See docs/design/gvf.md §3.3 / §7.
        if (topic.startsWith('sys/gqi/')) {
            if (emitter !== 'sys') {
                return false;
            }
            return super.emit(topic, data);
        }

        // 2. Create trace intent.
        const trace: EventTrace = {
            id: Math.random().toString(36).substring(7),
            topic,
            emitter,
            timestamp: Date.now(),
            status: 'allowed',
            payloadHash: this._hashPayload(data),
            causalLinks: []
        };

        // 3. UPCM governance decision.
        const violation = GovernanceEnforcer.validateEmission(topic, data, emitter);

        let finalizedTrace: EventTrace = trace;
        if (violation) {
            finalizedTrace = {
                ...trace,
                status: 'blocked',
                violation
            };
        }

        // 4. Constitutional finalization (Deep-Freeze + future temporal check).
        // Constitutional invariant failures during finalization are
        // unrecoverable. Dispatch follows the §5 mode table: Production
        // never throws; Development throws iff strictOverride; Test
        // always throws. See docs/design/gvf.md §5 + §8.
        try {
            ObservabilityService.logEvent(finalizedTrace);
        } catch (e) {
            console.error(`[FATAL] Constitutional Violation: ${e instanceof Error ? e.message : String(e)}`);
            if (EventBus._shouldThrowOnViolation()) {
                throw e;
            }
            return false;
        }

        // 5. Authoritative execution.
        if (finalizedTrace.status === 'blocked') {
            const v = finalizedTrace.violation!;
            console.error(`[EventBus] Blocked [${v.reasonCode}]: ${v.message}`);
            if (EventBus._shouldThrowOnViolation()) {
                throw new Error(v.message);
            }
            return false;
        }

        return super.emit(topic, data);
    }

    public on<T>(topic: string, callback: EventCallback<T>): this {
        return super.addListener(topic, callback as any);
    }

    public off<T>(topic: string, callback: EventCallback<T>): this {
        return super.removeListener(topic, callback as any);
    }

    private _hashPayload(data: any): string {
        try {
            return `len:${JSON.stringify(data).length}`;
        } catch {
            return 'len:unknown';
        }
    }
}

export const globalEventBus = EventBus.getInstance();
