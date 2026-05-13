import { expect } from 'chai';
import { EventBus, RuntimeMode } from '../../core/EventBus';
import { TraceStore, ObservabilityService } from '../../core/Observability';

describe('GVF: Constitutional Invariants', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        eventBus.removeAllListeners();
        TraceStore['traces'] = []; // Force clear for tests
        // Constitutional invariants are exercised in Test mode per §5.
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Test });
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

    // Temporal Consistency is DEFERRED per docs/design/gvf.md §3.4.
    // validateTemporalInvariant is retained as a NON-AUTHORITATIVE diagnostic
    // helper; it is no longer called from logEvent at runtime. The test below
    // verifies the helper still detects an inverted timestamp when invoked
    // directly, so that future re-introduction (against a real causal graph,
    // not wall-clock adjacency) inherits a working primitive.
    it('validateTemporalInvariant helper detects inverted timestamps (diagnostic only)', () => {
        eventBus.emit('chat/send', { text: 'first', version: '1.0.0' }, 'ui');
        const first = TraceStore.getLast()!;

        const invertedTrace = {
            ...first,
            id: 'inverted',
            timestamp: first.timestamp - 1000
        };

        expect(() => {
            ObservabilityService.validateTemporalInvariant(invertedTrace as any);
        }).to.throw(/Temporal Invariant Violation/);
    });

    it('logEvent does NOT enforce temporal ordering at runtime (deferred per §3.4)', () => {
        eventBus.emit('chat/send', { text: 'first', version: '1.0.0' }, 'ui');
        const first = TraceStore.getLast()!;

        const invertedTrace = Object.freeze({
            ...first,
            id: 'inverted',
            timestamp: first.timestamp - 1000,
            causalLinks: Object.freeze([])
        });

        // Must NOT throw — runtime path is temporal-unaware until causal lineage exists.
        expect(() => {
            ObservabilityService.logEvent(invertedTrace as any);
        }).to.not.throw();
    });

    it('should Panic in Strict Mode on Invariant Violation', () => {
        // Attempting to push an un-frozen trace directly to Store
        const rawTrace = { id: 'raw', topic: 'test', timestamp: Date.now() };
        
        expect(() => {
            TraceStore.push(rawTrace as any);
        }).to.throw(/Constitutional Violation/);
    });
});
