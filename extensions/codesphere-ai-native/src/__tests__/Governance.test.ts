import { expect } from 'chai';
import { GovernanceEnforcer } from '../core/Governance';
import { PROTOCOL_VERSION } from '../types/protocol';

describe('GovernanceEnforcer', () => {
    describe('context/add type vocabulary', () => {
        const variants: Array<'file' | 'folder' | 'selection' | 'symbol' | 'snippet'> = [
            'file', 'folder', 'selection', 'symbol', 'snippet'
        ];

        for (const type of variants) {
            it(`accepts context/add with type '${type}'`, () => {
                const violation = GovernanceEnforcer.validateEmission(
                    'context/add',
                    { uri: '/a', type, version: PROTOCOL_VERSION },
                    'ui'
                );
                expect(violation).to.equal(null);
            });

            it(`accepts context/update with type '${type}'`, () => {
                const violation = GovernanceEnforcer.validateEmission(
                    'context/update',
                    { uri: '/a', type, version: PROTOCOL_VERSION },
                    'host'
                );
                expect(violation).to.equal(null);
            });
        }

        it('rejects context/add with an unknown type', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'context/add',
                { uri: '/a', type: 'bogus', version: PROTOCOL_VERSION },
                'ui'
            );
            expect(violation).to.not.equal(null);
            expect(violation!.reasonCode).to.equal('INVALID_PAYLOAD');
        });
    });

    describe('emitter authorization', () => {
        it('rejects chat/delta from ui (only chat may emit)', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'chat/delta',
                { id: '1', delta: 'x', version: PROTOCOL_VERSION },
                'ui'
            );
            expect(violation).to.not.equal(null);
            expect(violation!.reasonCode).to.equal('UNAUTHORIZED_EMITTER');
        });

        it('rejects unknown topics', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'made/up',
                { version: PROTOCOL_VERSION },
                'ui'
            );
            expect(violation).to.not.equal(null);
            expect(violation!.reasonCode).to.equal('UNKNOWN_TOPIC');
        });
    });

    describe('chat/stop', () => {
        it('accepts chat/stop from ui with an id', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'chat/stop',
                { id: 'abc', version: PROTOCOL_VERSION },
                'ui'
            );
            expect(violation).to.equal(null);
        });

        it('accepts chat/stop from ui without an id', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'chat/stop',
                { version: PROTOCOL_VERSION },
                'ui'
            );
            expect(violation).to.equal(null);
        });

        it('rejects chat/stop from chat (only ui may stop)', () => {
            const violation = GovernanceEnforcer.validateEmission(
                'chat/stop',
                { version: PROTOCOL_VERSION },
                'chat'
            );
            expect(violation).to.not.equal(null);
            expect(violation!.reasonCode).to.equal('UNAUTHORIZED_EMITTER');
        });
    });
});
