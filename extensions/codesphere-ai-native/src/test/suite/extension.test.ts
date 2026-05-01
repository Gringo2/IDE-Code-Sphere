import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

    test('Sidebar views should be registered', () => {
        const chatView = vscode.window.registerWebviewViewProvider('codesphere.ai.chat', {
            resolveWebviewView: () => {}
        });
        assert.ok(chatView);
    });
});
