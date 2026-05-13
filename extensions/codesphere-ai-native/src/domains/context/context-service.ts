import * as vscode from 'vscode';
import { globalEventBus } from '../../core/EventBus';
import { ContextItem, PROTOCOL_VERSION } from '../../types/protocol';

/**
 * Tracks the active editor as an implicit "active file" context item.
 *
 * The host emits context/add on every editor switch so the Context sidebar
 * can render it; AiService pulls the current item via getItems() and injects
 * it as a system turn before the user message.
 *
 * Scope at MVP: a single active file, snapshot at activation/switch time
 * (not live-updated as the user types). Caps content at MAX_FILE_BYTES to
 * keep prompts bounded and traces memory-safe.
 */
export class ContextService implements vscode.Disposable {
    private static readonly MAX_FILE_BYTES = 4096;

    private _activeFile?: ContextItem;
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor && this._isUserDocument(editor.document)) {
                    this._setActiveFile(editor);
                }
            })
        );

        const current = vscode.window.activeTextEditor;
        if (current && this._isUserDocument(current.document)) {
            this._setActiveFile(current);
        }
    }

    public getItems(): ContextItem[] {
        return this._activeFile ? [this._activeFile] : [];
    }

    public dispose(): void {
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables = [];
    }

    private _isUserDocument(doc: vscode.TextDocument): boolean {
        return doc.uri.scheme === 'file' || doc.uri.scheme === 'untitled';
    }

    private _setActiveFile(editor: vscode.TextEditor): void {
        const item: ContextItem = {
            uri: editor.document.uri.toString(),
            type: 'file',
            content: editor.document.getText().slice(0, ContextService.MAX_FILE_BYTES),
            version: PROTOCOL_VERSION
        };
        this._activeFile = item;
        globalEventBus.emit('context/add', item, 'host');
    }
}
