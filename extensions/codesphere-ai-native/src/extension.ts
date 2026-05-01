import * as vscode from 'vscode';
import { ChatSidebarProvider } from './domains/chat/ChatSidebarProvider';
import { ContextSidebarProvider } from './domains/context/ContextSidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    const chatProvider = new ChatSidebarProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatSidebarProvider.viewType,
            chatProvider
        )
    );

    const contextProvider = new ContextSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ContextSidebarProvider.viewType,
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
