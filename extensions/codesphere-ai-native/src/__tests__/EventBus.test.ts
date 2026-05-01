import { expect } from 'chai';
import { EventBus } from '../core/EventBus';

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        eventBus.removeAllListeners();
    });

    it('should emit data to subscribers', (done) => {
        const testData = { text: 'hello', version: '1.0.0' };
        eventBus.on('chat/send', (data) => {
            expect(data).to.deep.equal(testData);
            done();
        });
        // Use an authorized domain to emit
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

    it('should throw on unauthorized emission (Governance)', () => {
        expect(() => {
            // 'ui' is not authorized to emit 'chat/delta' (only 'chat' is)
            eventBus.emit('chat/delta', { id: '1', delta: 'hi', version: '1.0.0' }, 'ui');
        }).to.throw(/is not authorized to emit/);
    });
});
