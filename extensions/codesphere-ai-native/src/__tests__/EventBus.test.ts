import { expect } from 'chai';
import { EventBus } from '../core/EventBus';

describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    it('should emit data to subscribers', (done) => {
        const testData = { text: 'hello' };
        eventBus.on('test:topic', (data) => {
            expect(data).to.deep.equal(testData);
            done();
        });
        eventBus.emit('test:topic', testData);
    });

    it('should handle multiple subscribers', () => {
        let count = 0;
        eventBus.on('topic', () => count++);
        eventBus.on('topic', () => count++);
        eventBus.emit('topic', {});
        expect(count).to.equal(2);
    });

    it('should remove subscribers with off', () => {
        let count = 0;
        const cb = () => count++;
        eventBus.on('topic', cb);
        eventBus.off('topic', cb);
        eventBus.emit('topic', {});
        expect(count).to.equal(0);
    });
});
