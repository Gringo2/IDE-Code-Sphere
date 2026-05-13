import { Domain } from './Governance';
import { RuntimeContract } from '../types/protocol';

/**
 * GOS Constitutional Invariants (Physical Guarantees):
 * 1. Traces are physically immutable (deep-frozen).
 * 2. Causality is temporally consistent (logical time directionality).
 * 3. Replay boundaries are explicit (authoritative history).
 * 4. Invariant violations panic in strict mode.
 */

export interface GovernanceViolation {
    readonly ruleId: string;
    readonly domain: Domain;
    readonly reasonCode: 'UNAUTHORIZED_EMITTER' | 'INVALID_PAYLOAD' | 'UNKNOWN_TOPIC';
    readonly message: string;
}

export interface CausalLink {
    readonly traceId: string;
    readonly topic: string;
    readonly emitter: Domain;
    readonly relation: 'triggered' | 'blocked-by' | 'derived-from';
    readonly direction: 'incoming' | 'outgoing';
}

export interface EventTrace {
    readonly id: string;
    readonly topic: string;
    readonly emitter: Domain;
    readonly timestamp: number;
    readonly status: 'allowed' | 'blocked';
    readonly violation?: GovernanceViolation;
    readonly payloadHash: string;
    readonly causalLinks: ReadonlyArray<CausalLink>;
}

export interface GovernanceStress {
    readonly violationsPerMinute: number;
    readonly hotspotRules: Record<string, number>;
    readonly stressLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Recursive Deep Freeze Utility.
 * Ensures no mutable reference survives trace finalization.
 */
export function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    
    Object.freeze(obj);
    
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const val = (obj as any)[prop];
        if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
            deepFreeze(val);
        }
    });

    return obj;
}

/**
 * GOS: TraceStore.
 * A physically immutable circular buffer for platform causality.
 */
export class TraceStore {
    private static traces: EventTrace[] = [];
    private static readonly MAX_TRACES = 1000;

    public static push(trace: EventTrace) {
        // Constitutional Invariant: Traces MUST be deep-frozen before entry
        if (!Object.isFrozen(trace)) {
            throw new Error('[TraceStore] Constitutional Violation: Attempted to push un-frozen trace.');
        }
        
        this.traces.push(trace);
        if (this.traces.length > this.MAX_TRACES) {
            this.traces.shift();
        }
    }

    public static getRecent(n: number = 10): EventTrace[] {
        return this.traces.slice(-n);
    }

    public static getById(id: string): EventTrace | undefined {
        return this.traces.find(t => t.id === id);
    }

    public static getLast(): EventTrace | undefined {
        return this.traces[this.traces.length - 1];
    }
}

/**
 * GOS: Observability Service.
 */
export class ObservabilityService {
    private static startTime = Date.now();
    private static negotiatedContract?: RuntimeContract;

    /**
     * Enforces logical time directionality.
     * child.timestamp >= parent.timestamp
     */
    public static validateTemporalInvariant(trace: EventTrace): void {
        const last = TraceStore.getLast();
        if (last && trace.timestamp < last.timestamp) {
            throw new Error(`[GOS] Temporal Invariant Violation: Event ${trace.id} has timestamp ${trace.timestamp} which is before previous event ${last.id} (${last.timestamp}).`);
        }
    }

    public static logEvent(trace: EventTrace) {
        this.validateTemporalInvariant(trace);
        TraceStore.push(deepFreeze(trace));
    }

    public static setNegotiatedContract(contract: RuntimeContract) {
        this.negotiatedContract = contract;
    }

    public static getSnapshot() {
        return {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            traceCount: TraceStore.getRecent(1000).length
        };
    }
}
