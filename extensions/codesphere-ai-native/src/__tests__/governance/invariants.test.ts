import { expect } from 'chai';
import { EventBus } from '../../core/EventBus';
import { TraceStore, ObservabilityService } from '../../core/Observability';

describe('GVF: Constitutional Invariants', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        TraceStore['traces'] = []; // Force clear for tests
    });

    it('should prove Physical Immutability (Deep Freeze)', () => {
        eventBus.emit('chat/send', { text: 'test', version: '1.0.0' }, 'ui');
        const trace = TraceStore.getLast()!;

        expect(Object.isFrozen(trace)).to.be.true;
        
        // Test deep immutability
        expect(() => {
            (trace as any).status = 'blocked';
        }).to.throw(TypeError);

        // Test nested immutability
        if (trace.causalLinks) {
            expect(Object.isFrozen(trace.causalLinks)).to.be.true;
        }
    });

    it('should prove Recursion Isolation (Silent Channel)', () => {
        const initialCount = TraceStore.getRecent(1000).length;
        
        // Emit on silent GQI channel
        eventBus.emit('sys/gqi/query', { query: 'test' }, 'sys');
        
        const finalCount = TraceStore.getRecent(1000).length;
        expect(finalCount).to.equal(initialCount);
    });

    it('should prove Temporal Consistency (Logical Time)', () => {
        // First event
        eventBus.emit('chat/send', { text: 'first', version: '1.0.0' }, 'ui');
        const first = TraceStore.getLast()!;

        // Manually try to log an event with an inverted timestamp
        const invertedTrace = {
            ...first,
            id: 'inverted',
            timestamp: first.timestamp - 1000
        };

        expect(() => {
            ObservabilityService.logEvent(invertedTrace as any);
        }).to.throw(/Temporal Invariant Violation/);
    });

    it('should Panic in Strict Mode on Invariant Violation', () => {
        // Attempting to push an un-frozen trace directly to Store
        const rawTrace = { id: 'raw', topic: 'test', timestamp: Date.now() };
        
        expect(() => {
            TraceStore.push(rawTrace as any);
        }).to.throw(/Constitutional Violation/);
    });
});
