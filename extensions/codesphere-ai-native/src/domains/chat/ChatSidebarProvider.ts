import * as vscode from 'vscode';
import { globalEventBus } from '../../core/EventBus';
import { AiService } from './ai-service';
import { ChatDelta, PROTOCOL_VERSION } from '../../types/protocol';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codesphere.ai.chat';

    constructor(private readonly _extensionUri: vscode.Uri) { }

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
                globalEventBus.emit(message.topic, { ...message.data, version: PROTOCOL_VERSION });
            }
        });

        // Listen for internal events to send back to webview
        const chatDeltaListener = (data: ChatDelta) => {
            webviewView.webview.postMessage({ topic: 'chat/delta', data: { ...data, version: PROTOCOL_VERSION } });
        };

        globalEventBus.on('chat/delta', chatDeltaListener);

        // Wire up AiService to listen for chat/send
        globalEventBus.on('chat/send', (data: { text: string }) => {
            AiService.handleChatSend(data.text);
        });

        webviewView.onDidDispose(() => {
            globalEventBus.off('chat/delta', chatDeltaListener);
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
