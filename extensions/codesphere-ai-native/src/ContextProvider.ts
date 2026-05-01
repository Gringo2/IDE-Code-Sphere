import * as vscode from 'vscode';
import { globalEventBus } from './core/EventBus';
import { ContextItem } from './types/protocol';

export class ContextProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codesphere.ai.context';

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
            if (message.topic) {
                globalEventBus.emit(message.topic, message.data);
            }
        });

        // Listen for context updates to send to UI
        const contextListener = (data: ContextItem) => {
            webviewView.webview.postMessage({ topic: 'context/update', data });
        };

        globalEventBus.on('context/add', contextListener);

        webviewView.onDidDispose(() => {
            globalEventBus.off('context/add', contextListener);
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // We'll reuse the same compiled React app but with a different routing/entry if needed
        // For now, let's assume the same App.tsx handles context via conditional rendering or routing
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
    <title>CodeSphere Context</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.viewType = "${ContextProvider.viewType}";
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
