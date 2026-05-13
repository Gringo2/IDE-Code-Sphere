import { expect } from 'chai';
import * as vscode from 'vscode';
import { globalEventBus, EventBus, RuntimeMode } from '../../core/EventBus';
import { TraceStore, ObservabilityService } from '../../core/Observability';

const EXTENSION_ID = 'codesphere.codesphere-ai-native';

describe('CodeSphere AI Native — Integration', () => {

    before(async () => {
        // Force activation so the test sees the post-activate state.
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    describe('Activation', () => {
        it('extension is present and activated', () => {
            const ext = vscode.extensions.getExtension(EXTENSION_ID);
            expect(ext, 'extension manifest must be discoverable').to.exist;
            expect(ext!.isActive, 'extension must be active after force-activate').to.equal(true);
        });

        it('all three declared commands are registered', async () => {
            const expected = [
                'codesphere.ai.helloWorld',
                'codesphere.ai.setOpenRouterKey',
                'codesphere.ai.resetOpenRouterConsent'
            ];
            const all = await vscode.commands.getCommands(true);
            for (const cmd of expected) {
                expect(all, `command ${cmd} must be registered`).to.include(cmd);
            }
        });
    });

    describe('EventBus bootstrap (GVF §5)', () => {
        it('bus is configured in Test mode for integration runs', () => {
            // ExtensionMode.Test in test-electron maps to RuntimeMode.Test.
            // We assert behavior, not internal state: governance violation throws.
            expect(() => {
                globalEventBus.emit('chat/delta', { id: '1', delta: 'x', version: '1.0.0' }, 'ui');
            }).to.throw(/is not authorized to emit/);
        });

        it('re-configuring after Test bootstrap is a constitutional violation', () => {
            expect(() => {
                EventBus.configure({ mode: RuntimeMode.Production });
            }).to.throw(/Constitutional Violation/);
        });
    });

    describe('Silent Channel (GVF §3.3 / §7)', () => {
        it('sys/gqi/* emit from sys does not produce a trace', () => {
            const before = TraceStore.getRecent(1000).length;
            const result = globalEventBus.emit('sys/gqi/probe', { ping: 1 }, 'sys');
            const after = TraceStore.getRecent(1000).length;
            expect(result, 'silent emit must succeed').to.equal(true);
            expect(after, 'silent channel must not record a trace').to.equal(before);
        });

        it('sys/gqi/* emit from a non-sys emitter is rejected (spoofing guard)', () => {
            const result = globalEventBus.emit('sys/gqi/probe', { ping: 1 }, 'ui');
            expect(result, 'spoofed silent emit must return false').to.equal(false);
        });
    });

    describe('Physical Immutability (GVF §3.1)', () => {
        it('traces in the store are deep-frozen', () => {
            globalEventBus.emit('chat/send', { text: 'integration-probe', version: '1.0.0' }, 'ui');
            const last = TraceStore.getLast()!;
            expect(last, 'a trace must be recorded').to.exist;
            expect(Object.isFrozen(last), 'trace must be frozen').to.equal(true);
            expect(() => {
                (last as any).status = 'mutated';
            }).to.throw(TypeError);
        });
    });

    describe('Context source — active editor', () => {
        it('opening a file emits context/add through the bus', async () => {
            const received: any[] = [];
            const listener = (data: any) => received.push(data);
            globalEventBus.on('context/add', listener);

            try {
                const doc = await vscode.workspace.openTextDocument({
                    language: 'plaintext',
                    content: 'integration probe content\nline two'
                });
                await vscode.window.showTextDocument(doc);

                // Editor-switch emit is synchronous, but give the event loop one tick.
                await new Promise(resolve => setTimeout(resolve, 50));

                expect(received.length, 'at least one context/add must have fired').to.be.greaterThan(0);
                const item = received[received.length - 1];
                expect(item.type).to.equal('file');
                expect(item.uri).to.be.a('string');
            } finally {
                globalEventBus.off('context/add', listener);
            }
        });
    });

    describe('Observability snapshot', () => {
        it('getSnapshot returns uptime and traceCount', () => {
            const snap = ObservabilityService.getSnapshot();
            expect(snap).to.have.property('uptime').that.is.a('number');
            expect(snap).to.have.property('traceCount').that.is.a('number');
            expect(snap.uptime).to.be.at.least(0);
        });
    });
});
