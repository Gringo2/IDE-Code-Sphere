import { EventEmitter } from 'events';
import { GovernanceEnforcer, Domain } from './Governance';
import { ObservabilityService, EventTrace } from './Observability';

export type EventCallback<T = any> = (data: T) => void;

/**
 * CodeSphere Global Event Bus.
 * Unified transport for UI ↔ Host ↔ Daemon.
 * Enforced by UPCM Governance with GOS Trace Pipeline.
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
     * Emits an event with governance validation and GOS tracing.
     * Causal traceability is decoupled from execution outcome.
     */
    public emit(topic: string, data: any, emitter: Domain = 'sys'): boolean {
        // A. Create Initial Trace
        const trace: EventTrace = {
            id: Math.random().toString(36).substring(7),
            topic,
            emitter,
            timestamp: Date.now(),
            status: 'allowed',
            payloadHash: this._hashPayload(data)
        };

        // B. Run Governance Decision
        const violation = GovernanceEnforcer.validateEmission(topic, data, emitter);
        
        if (violation) {
            trace.status = 'blocked';
            trace.violation = violation;
            
            // C. Finalize Trace & Push (Violation path)
            ObservabilityService.logEvent(trace);
            
            console.error(`[EventBus] Governance Blocked [${violation.reasonCode}]: ${violation.message}`);
            
            if (process.env.NODE_ENV !== 'production') {
                // In dev, we fail fast to alert the developer.
                throw new Error(violation.message);
            }
            return false;
        }

        // C. Finalize Trace & Push (Success path)
        ObservabilityService.logEvent(trace);
        
        // Execute actual emission
        return super.emit(topic, data);
    }

    public on<T>(topic: string, callback: EventCallback<T>): this {
        return super.addListener(topic, callback as any);
    }

    public off<T>(topic: string, callback: EventCallback<T>): this {
        return super.removeListener(topic, callback as any);
    }

    private _hashPayload(data: any): string {
        // Minimal hash (length-based) for memory safety in traces
        try {
            return `len:${JSON.stringify(data).length}`;
        } catch {
            return 'len:unknown';
        }
    }
}

export const globalEventBus = EventBus.getInstance();
