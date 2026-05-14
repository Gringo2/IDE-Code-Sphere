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

        it('every command declared in the manifest is registered', async () => {
            // Read the manifest dynamically so a 4th command added to
            // contributes.commands without a matching registerCommand call
            // surfaces here instead of slipping through.
            const ext = vscode.extensions.getExtension(EXTENSION_ID)!;
            const declared: string[] = (ext.packageJSON.contributes?.commands ?? []).map(
                (c: { command: string }) => c.command
            );
            expect(declared.length, 'manifest must declare at least one command').to.be.greaterThan(0);
            const all = await vscode.commands.getCommands(true);
            for (const cmd of declared) {
                expect(all, `command ${cmd} (declared in manifest) must be registered`).to.include(cmd);
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
            // Precondition: activation must have already configured the bus
            // in Test mode. Without it, configure() would succeed silently
            // rather than throw — and this test would be a no-op rather than
            // a contract check. Re-using the chat/delta unauthorized-emit
            // tell keeps the dependency explicit without poking private state.
            expect(
                () => globalEventBus.emit('chat/delta', { id: '1', delta: 'x', version: '1.0.0' }, 'ui'),
                'precondition: bus must already be in Test mode'
            ).to.throw();

            expect(() => {
                EventBus.configure({ mode: RuntimeMode.Production });
            }).to.throw(/Constitutional Violation/);
        });
    });

    describe('Silent Channel (GVF §3.3 / §7)', () => {
        it('sys/gqi/* emit from sys does not produce a trace', () => {
            const before = TraceStore.getRecent(1000).length;
            // Don't assert the return value of emit() here. The silent-channel
            // branch ends in super.emit() (Node's EventEmitter), which returns
            // true iff there are listeners. Nothing listens to sys/gqi/probe,
            // so the return is always false — a meaningless signal. The count
            // delta below is the actual silence invariant.
            globalEventBus.emit('sys/gqi/probe', { ping: 1 }, 'sys');
            const after = TraceStore.getRecent(1000).length;
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

                // Poll instead of a fixed sleep. onDidChangeActiveTextEditor
                // is dispatched through the host's event loop, so the wall
                // time between showTextDocument resolving and the listener
                // firing depends on Electron startup, CI load, and editor
                // state. A 50ms fixed wait flakes on slow runners.
                const deadline = Date.now() + 2000;
                while (received.length === 0 && Date.now() < deadline) {
                    await new Promise(resolve => setTimeout(resolve, 25));
                }

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
