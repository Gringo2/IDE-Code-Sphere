import { Domain } from './Governance';
import { RuntimeContract } from '../types/protocol';

/**
 * GVF Constitutional Invariants (Physical Guarantees), per docs/design/gvf.md §3:
 *   3.1 Physical Immutability   — traces are deep-frozen.
 *   3.2 Replay Boundaries        — TraceStore is a bounded circular buffer.
 *   3.3 Recursion Isolation      — Silent Channel (sys/gqi/*) bypasses tracing.
 *   3.4 Temporal Consistency    — DEFERRED until causal lineage is populated.
 */

export interface GovernanceViolation {
    readonly ruleId: string;
    readonly domain: Domain;
    readonly reasonCode: 'UNAUTHORIZED_EMITTER' | 'INVALID_PAYLOAD' | 'UNKNOWN_TOPIC';
    readonly message: string;
}

/**
 * NON-AUTHORITATIVE: Diagnostic scaffolding only.
 * Typed surface for causal lineage. No runtime code constructs CausalLinks
 * yet, so the causality graph is not load-bearing on replay or any other
 * constitutional guarantee. Promotion to authoritative requires:
 *   1. A populator that constructs links during emit.
 *   2. Tests proving link semantics.
 *   3. A spec entry in docs/design/gvf.md naming it.
 * See docs/design/gvf.md §6.
 */
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

/**
 * NON-AUTHORITATIVE: Diagnostic scaffolding only.
 * Typed observability metric. Not yet computed by any subsystem and not
 * read by any consumer. Promotion to authoritative requires a populator,
 * a sampling cadence, and a consumer (likely the Silent Channel debug
 * UI in §14 step 5). See docs/design/gvf.md §6.
 */
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
     * NON-AUTHORITATIVE: Diagnostic-only helper.
     *
     * Wall-clock adjacency is not causality. Until CausalLink is populated
     * by runtime lineage construction, this check cannot distinguish a real
     * causal inversion from a concurrent emit with skewed clocks. The spec
     * (docs/design/gvf.md §3.4) defers Temporal Consistency as a constitutional
     * invariant until all three re-introduction conditions hold:
     *   1. CausalLink populated authoritatively.
     *   2. Causal parents identifiable from causalLinks.
     *   3. Replay graph reconstruction implemented.
     *
     * Retained as an exported helper so future re-introduction (restated
     * against the causal graph, NOT TraceStore.getLast()) doesn't need to
     * rebuild the function. Not called from logEvent in v1.
     */
    public static validateTemporalInvariant(trace: EventTrace): void {
        const last = TraceStore.getLast();
        if (last && trace.timestamp < last.timestamp) {
            throw new Error(`[GOS] Temporal Invariant Violation: Event ${trace.id} has timestamp ${trace.timestamp} which is before previous event ${last.id} (${last.timestamp}).`);
        }
    }

    public static logEvent(trace: EventTrace) {
        // Temporal check intentionally NOT called here at v1. See validateTemporalInvariant docs.
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
