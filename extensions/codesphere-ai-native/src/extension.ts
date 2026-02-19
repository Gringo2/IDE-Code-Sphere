import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeSphere AI Native extension is now active!');

    let disposable = vscode.commands.registerCommand('codesphere.ai.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from CodeSphere AI Native!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
