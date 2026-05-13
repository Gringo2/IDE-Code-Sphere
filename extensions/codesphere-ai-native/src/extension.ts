import * as vscode from 'vscode';
import { ChatSidebarProvider } from './domains/chat/ChatSidebarProvider';
import { ContextSidebarProvider } from './domains/context/ContextSidebarProvider';
import { ContextService } from './domains/context/context-service';
import { EventBus, RuntimeMode } from './core/EventBus';

export const OPENROUTER_CONSENT_KEY = 'codesphere.ai.openRouterConsent.v1';

function toRuntimeMode(mode: vscode.ExtensionMode): RuntimeMode {
    switch (mode) {
        case vscode.ExtensionMode.Production: return RuntimeMode.Production;
        case vscode.ExtensionMode.Development: return RuntimeMode.Development;
        case vscode.ExtensionMode.Test: return RuntimeMode.Test;
        default: return RuntimeMode.Production;
    }
}

export function activate(context: vscode.ExtensionContext) {
    // GVF bootstrap boundary per docs/design/gvf.md §5 + §9.
    // EventBus mode is set once, here, and immutable thereafter (Test mode
    // forbids re-entry). CODESPHERE_GOVERNANCE_STRICT=1 escalates Development
    // to throw-on-violation; Production never honors the override.
    EventBus.configure({
        mode: toRuntimeMode(context.extensionMode),
        strictOverride: process.env.CODESPHERE_GOVERNANCE_STRICT === '1'
    });

    const contextService = new ContextService();
    context.subscriptions.push(contextService);

    const chatProvider = new ChatSidebarProvider(
        context.extensionUri,
        context.secrets,
        context.globalState,
        contextService
    );

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

    context.subscriptions.push(
        vscode.commands.registerCommand('codesphere.ai.resetOpenRouterConsent', async () => {
            await context.globalState.update(OPENROUTER_CONSENT_KEY, undefined);
            vscode.window.showInformationMessage('CodeSphere AI OpenRouter consent reset. You will be prompted again on the next chat.');
        })
    );
}

export function deactivate() { }
