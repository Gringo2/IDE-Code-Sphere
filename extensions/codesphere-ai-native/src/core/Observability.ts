import { Domain } from './Governance';
import { RuntimeContract } from '../types/protocol';

export interface GovernanceViolation {
    ruleId: string;
    domain: Domain;
    reasonCode: 'UNAUTHORIZED_EMITTER' | 'INVALID_PAYLOAD' | 'UNKNOWN_TOPIC';
    message: string;
}

export interface EventTrace {
    id: string;
    topic: string;
    emitter: Domain;
    timestamp: number;
    status: 'allowed' | 'blocked';
    violation?: GovernanceViolation;
    payloadHash: string; // Hash or length to prevent memory leaks
}

export interface TraceFilter {
    domain?: Domain;
    topic?: string;
    status?: 'allowed' | 'blocked';
}

/**
 * GOS: TraceStore.
 * A queryable, memory-safe circular buffer for platform causality.
 */
export class TraceStore {
    private static traces: EventTrace[] = [];
    private static readonly MAX_TRACES = 1000;

    public static push(trace: EventTrace) {
        this.traces.push(trace);
        if (this.traces.length > this.MAX_TRACES) {
            this.traces.shift();
        }
    }

    public static query(filter: TraceFilter): EventTrace[] {
        return this.traces.filter(t => {
            if (filter.domain && t.emitter !== filter.domain) return false;
            if (filter.topic && t.topic !== filter.topic) return false;
            if (filter.status && t.status !== filter.status) return false;
            return true;
        });
    }

    public static getRecent(n: number = 10): EventTrace[] {
        return this.traces.slice(-n);
    }

    public static clear() {
        this.traces = [];
    }
}

/**
 * GOS: Governance Observability Service.
 * The self-inspection brain of the platform.
 */
export class ObservabilityService {
    private static startTime = Date.now();
    private static negotiatedContract?: RuntimeContract;

    public static logEvent(trace: EventTrace) {
        // Side-effect safe: Push to store async or via buffered queue if needed
        TraceStore.push(trace);
    }

    public static setNegotiatedContract(contract: RuntimeContract) {
        this.negotiatedContract = contract;
    }

    public static getSnapshot() {
        return {
            contract: this.negotiatedContract,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            recentViolations: TraceStore.query({ status: 'blocked' }).slice(-5)
        };
    }
}
