import * as vscode from 'vscode';
import { ChatSidebarProvider } from './domains/chat/ChatSidebarProvider';
import { ContextSidebarProvider } from './domains/context/ContextSidebarProvider';

export function activate(context: vscode.ExtensionContext) {
    const chatProvider = new ChatSidebarProvider(context.extensionUri, context.secrets);

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

    context.subscriptions.push(
        vscode.commands.registerCommand('codesphere.ai.setOpenRouterKey', async () => {
            const apiKey = await vscode.window.showInputBox({
                title: 'Set OpenRouter API Key',
                prompt: 'Stored securely in VS Code SecretStorage for CodeSphere AI chat.',
                password: true,
                ignoreFocusOut: true,
                validateInput: value => value.trim().length > 0 ? undefined : 'API key is required.'
            });

            if (!apiKey) {
                return;
            }

            await context.secrets.store('codesphere.openRouterApiKey', apiKey.trim());
            vscode.window.showInformationMessage('CodeSphere AI OpenRouter API key saved.');
        })
    );
}

export function deactivate() { }
