import * as vscode from 'vscode';
import { globalEventBus } from '../../core/EventBus';
import { AiService, ChatSendRequest, ChatTurn } from './ai-service';
import { ChatDelta, PROTOCOL_VERSION } from '../../types/protocol';
import { ContextService } from '../context/context-service';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codesphere.ai.chat';
    private readonly _aiService: AiService;
    private _activeStream?: AbortController;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        secrets: vscode.SecretStorage,
        globalState: vscode.Memento,
        private readonly _contextService: ContextService
    ) {
        this._aiService = new AiService(secrets, globalState);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            console.log(`[ChatSidebarProvider] Received message from webview:`, message);
            if (message.topic) {
                globalEventBus.emit(message.topic, { ...message.data, version: PROTOCOL_VERSION }, 'ui');
            }
        });

        // Listen for internal events to send back to webview
        const chatDeltaListener = (data: ChatDelta) => {
            webviewView.webview.postMessage({ topic: 'chat/delta', data: { ...data, version: PROTOCOL_VERSION } });
        };

        globalEventBus.on('chat/delta', chatDeltaListener);

        // Wire up AiService to listen for chat/send. Each send gets its own
        // AbortController so chat/stop can cancel the in-flight stream. The
        // host augments the webview's chat/send payload with implicit context
        // (active file) before passing to the provider.
        const chatSendListener = (data: { text: string; history?: ChatTurn[] }) => {
            this._activeStream?.abort();
            this._activeStream = new AbortController();
            const controller = this._activeStream;
            const req: ChatSendRequest = {
                text: data.text,
                history: data.history,
                context: this._contextService.getItems()
            };
            this._aiService.handleChatSend(req, controller.signal)
                .finally(() => {
                    if (this._activeStream === controller) {
                        this._activeStream = undefined;
                    }
                });
        };

        const chatStopListener = () => {
            this._activeStream?.abort();
            this._activeStream = undefined;
        };

        globalEventBus.on('chat/send', chatSendListener);
        globalEventBus.on('chat/stop', chatStopListener);

        webviewView.onDidDispose(() => {
            this._activeStream?.abort();
            this._activeStream = undefined;
            globalEventBus.off('chat/delta', chatDeltaListener);
            globalEventBus.off('chat/send', chatSendListener);
            globalEventBus.off('chat/stop', chatStopListener);
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', 'assets', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build', 'assets', 'index.css')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>CodeSphere AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.viewType = "${ChatSidebarProvider.viewType}";
      window.protocolVersion = "${PROTOCOL_VERSION}";
    </script>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
