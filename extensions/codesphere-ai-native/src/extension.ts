import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { ContextProvider } from './ContextProvider';

export function activate(context: vscode.ExtensionContext) {
    const sidebarProvider = new SidebarProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );

    const contextProvider = new ContextProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ContextProvider.viewType,
            contextProvider
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codesphere.ai.helloWorld', () => {
            vscode.commands.executeCommand('codesphere.ai.chat.focus');
        })
    );
}

export function deactivate() { }
