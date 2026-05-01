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
}

export interface ContextItem {
    uri: string;
    type: 'file' | 'folder' | 'selection';
    content?: string;
}

export type CodeSphereEvent = 
    | { topic: 'chat/send', data: { text: string, context?: ContextItem[] } }
    | { topic: 'chat/delta', data: ChatDelta }
    | { topic: 'context/add', data: ContextItem }
    | { topic: 'status/update', data: { state: 'idle' | 'busy' | 'error', message?: string } };
