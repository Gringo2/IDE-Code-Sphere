/**
 * Simple hook to access the VS Code API from within the React webview.
 */
export function useVSCode() {
    const vscode = (window as any).acquireVsCodeApi?.();
    const version = (window as any).protocolVersion || '0.0.0';
    
    const postMessage = (topic: string, data?: any) => {
        vscode?.postMessage({ topic, data: { ...data, version } });
    };

    return { postMessage, version };
}
