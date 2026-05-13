import { EventEmitter } from 'events';
import { GovernanceEnforcer, Domain } from './Governance';
import { ObservabilityService, EventTrace } from './Observability';

export type EventCallback<T = any> = (data: T) => void;

/**
 * CodeSphere Global Event Bus.
 * Unified transport for UI ↔ Host ↔ Daemon.
 * Enforced by UPCM Governance and GVF Constitutional Verification.
 */
export class EventBus extends EventEmitter {
    private static _instance: EventBus;

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
        // Constitutional invariant failures during finalization are unrecoverable.
        // Strict-mode escalation is opt-in via CODESPHERE_GOVERNANCE_STRICT=1.
        // VS Code's extension host does not set NODE_ENV reliably, so we key
        // off an explicit flag instead. See docs/design/gvf.md §5.
        try {
            ObservabilityService.logEvent(finalizedTrace);
        } catch (e) {
            console.error(`[FATAL] Constitutional Violation: ${e instanceof Error ? e.message : String(e)}`);
            if (process.env.CODESPHERE_GOVERNANCE_STRICT === '1') {
                throw e;
            }
            return false;
        }

        // 5. Authoritative execution.
        if (finalizedTrace.status === 'blocked') {
            const v = finalizedTrace.violation!;
            console.error(`[EventBus] Blocked [${v.reasonCode}]: ${v.message}`);
            if (process.env.CODESPHERE_GOVERNANCE_STRICT === '1') {
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
