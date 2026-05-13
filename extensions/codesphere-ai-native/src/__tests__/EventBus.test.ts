import { expect } from 'chai';
import { EventBus, RuntimeMode } from '../core/EventBus';

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        eventBus.removeAllListeners();
        // Default each test to Production (no panics). Tests that need
        // strict semantics opt in explicitly via configure().
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Production });
    });

    it('should emit data to subscribers', (done) => {
        const testData = { text: 'hello', version: '1.0.0' };
        eventBus.on('chat/send', (data) => {
            expect(data).to.deep.equal(testData);
            done();
        });
        eventBus.emit('chat/send', testData, 'ui');
    });

    it('should handle multiple subscribers', () => {
        let count = 0;
        eventBus.on('chat/send', () => count++);
        eventBus.on('chat/send', () => count++);

        eventBus.emit('chat/send', { text: 'test', version: '1.0.0' }, 'ui');
        expect(count).to.equal(2);
    });

    it('should remove subscribers with off', () => {
        let count = 0;
        const cb = () => count++;
        eventBus.on('chat/send', cb);
        eventBus.off('chat/send', cb);
        eventBus.emit('chat/send', { text: 'test', version: '1.0.0' }, 'ui');
        expect(count).to.equal(0);
    });

    it('returns false on unauthorized emission in Production mode', () => {
        // Default beforeEach mode is Production.
        const result = eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        expect(result).to.equal(false);
    });

    it('returns false on unauthorized emission in Development without strictOverride', () => {
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Development, strictOverride: false });
        const result = eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        expect(result).to.equal(false);
    });

    it('throws on unauthorized emission in Development with strictOverride', () => {
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Development, strictOverride: true });
        expect(() => {
            eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        }).to.throw(/is not authorized to emit/);
    });

    it('throws on unauthorized emission in Test mode (always)', () => {
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Test });
        expect(() => {
            eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        }).to.throw(/is not authorized to emit/);
    });

    it('Production never throws even with strictOverride set', () => {
        EventBus._resetConfigForTests();
        EventBus.configure({ mode: RuntimeMode.Production, strictOverride: true });
        const result = eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        expect(result).to.equal(false);
    });

    describe('configure()', () => {
        it('Test mode forbids re-configuration (constitutional violation)', () => {
            EventBus._resetConfigForTests();
            EventBus.configure({ mode: RuntimeMode.Test });
            expect(() => {
                EventBus.configure({ mode: RuntimeMode.Production });
            }).to.throw(/Constitutional Violation/);
        });

        it('forbids re-configuration when target mode is Test', () => {
            EventBus._resetConfigForTests();
            EventBus.configure({ mode: RuntimeMode.Production });
            expect(() => {
                EventBus.configure({ mode: RuntimeMode.Test });
            }).to.throw(/Constitutional Violation/);
        });

        it('Development allows re-configuration (warns, but proceeds)', () => {
            EventBus._resetConfigForTests();
            EventBus.configure({ mode: RuntimeMode.Development });
            expect(() => {
                EventBus.configure({ mode: RuntimeMode.Development, strictOverride: true });
            }).to.not.throw();
        });
    });
});
