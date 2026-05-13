export const PROTOCOL_VERSION = '1.0.0';

export type RuntimeRole = 'host' | 'daemon' | 'ui';

export interface RuntimeContract {
    protocolVersion: string;
    identity: {
        name: string;
        role: RuntimeRole;
    };
    capabilities: {
        chat: 'none' | 'basic' | 'streaming';
        indexing: 'none' | 'deterministic' | 'full';
        terminal: 'read' | 'read-write' | 'none';
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface ChatDelta {
    id: string;
    delta: string;
    done?: boolean;
    version?: string;
}

export type ContextItemType = 'file' | 'folder' | 'selection' | 'symbol' | 'snippet';

export interface ContextItem {
    uri: string;
    content?: string;
    type: ContextItemType;
    version?: string;
}

export interface NegotiationMessage {
    contract: RuntimeContract;
    timestamp: number;
}

export type CodeSphereEvent = 
    | { topic: 'chat/send', data: { text: string, context?: ContextItem[] } }
    | { topic: 'chat/delta', data: ChatDelta }
    | { topic: 'context/add', data: ContextItem }
    | { topic: 'status/update', data: { state: 'idle' | 'busy' | 'error', message?: string } };
