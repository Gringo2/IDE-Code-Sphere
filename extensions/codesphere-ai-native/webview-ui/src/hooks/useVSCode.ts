/**
 * Simple hook to access the VS Code API from within the React webview.
 */
export function useVSCode() {
    const vscode = (window as any).acquireVsCodeApi?.();
    
    const postMessage = (topic: string, data?: any) => {
        vscode?.postMessage({ topic, data });
    };

    return { postMessage };
}
