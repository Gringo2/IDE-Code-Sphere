import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codesphere.ai.helloWorld', () => {
            vscode.commands.executeCommand('codesphere.ai.chat.focus');
        })
    );
}

export function deactivate() { }
