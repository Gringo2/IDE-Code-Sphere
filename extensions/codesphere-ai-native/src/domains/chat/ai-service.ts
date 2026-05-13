import * as vscode from 'vscode';
import { globalEventBus } from '../../core/EventBus';
import { ChatDelta, PROTOCOL_VERSION } from '../../types/protocol';

export interface ChatTurn {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatSendRequest {
    text: string;
    history?: ChatTurn[];
}

export class AiService {
    private static readonly OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    private static readonly SYSTEM_PROMPT = 'You are CodeSphere AI, a concise coding assistant embedded in CodeSphere IDE.';
    private static readonly MAX_HISTORY_TURNS = 40;

    constructor(private readonly secrets: vscode.SecretStorage) { }

    public async handleChatSend(req: ChatSendRequest, signal?: AbortSignal): Promise<void> {
        const messageId = Math.random().toString(36).substring(7);
        console.log(`[AiService] chat/send id=${messageId} history=${req.history?.length ?? 0} text=${req.text.slice(0, 80)}`);

        try {
            await this.streamOpenRouterCompletion(req, messageId, signal);
        } catch (e) {
            if (signal?.aborted) {
                console.log(`[AiService] stream aborted id=${messageId}`);
                this.emitDelta(messageId, '', true);
                return;
            }
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[AiService] OpenRouter request failed: ${message}`);
            this.emitDelta(messageId, `OpenRouter request failed: ${message}`, true);
        }
    }

    private async streamOpenRouterCompletion(
        req: ChatSendRequest,
        messageId: string,
        signal?: AbortSignal
    ): Promise<void> {
        const apiKey = await this.getOpenRouterApiKey();
        if (!apiKey) {
            throw new Error('No OpenRouter API key is configured. Run "CodeSphere AI: Set OpenRouter API Key" from the command palette.');
        }

        const model = vscode.workspace
            .getConfiguration('codesphere.ai')
            .get<string>('openRouterModel', 'openai/gpt-oss-120b');

        const messages = this.buildMessages(req);

        const response = await fetch(AiService.OPENROUTER_URL, {
            method: 'POST',
            signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/CodeSphere/codesphere-IDE',
                'X-Title': 'CodeSphere AI Native'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter returned ${response.status}: ${errorText.slice(0, 300)}`);
        }
        if (!response.body) {
            throw new Error('OpenRouter returned no response body.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let received = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                let idx: number;
                while ((idx = buffer.indexOf('\n\n')) >= 0) {
                    const event = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);

                    if (!event.startsWith('data:')) {
                        continue;
                    }
                    const payload = event.slice(5).trim();
                    if (payload === '[DONE]') {
                        this.emitDelta(messageId, '', true);
                        return;
                    }
                    try {
                        const json = JSON.parse(payload);
                        const delta = json?.choices?.[0]?.delta?.content;
                        if (typeof delta === 'string' && delta.length > 0) {
                            received += delta.length;
                            this.emitDelta(messageId, delta, false);
                        }
                    } catch {
                        // Skip malformed SSE chunks; the stream may include keep-alives.
                    }
                }
            }
        } finally {
            try { reader.releaseLock(); } catch { /* already released */ }
        }

        // Stream closed without an explicit [DONE]. Emit a terminal delta so the UI
        // can flip out of the streaming state.
        if (received > 0) {
            this.emitDelta(messageId, '', true);
        } else {
            throw new Error('OpenRouter returned an empty stream.');
        }
    }

    private buildMessages(req: ChatSendRequest): ChatTurn[] {
        // Canonical system prompt is enforced server-side; drop any system turns
        // the webview sent so it cannot override behavior via injected history.
        const history = (req.history ?? []).filter(turn => turn.role !== 'system');
        const trimmed = history.slice(-AiService.MAX_HISTORY_TURNS);
        return [
            { role: 'system', content: AiService.SYSTEM_PROMPT },
            ...trimmed,
            { role: 'user', content: req.text }
        ];
    }

    private emitDelta(id: string, delta: string, done: boolean): void {
        const event: ChatDelta = {
            id,
            delta,
            done,
            version: PROTOCOL_VERSION
        };
        globalEventBus.emit('chat/delta', event, 'chat');
    }

    private async getOpenRouterApiKey(): Promise<string | undefined> {
        return await this.secrets.get('codesphere.openRouterApiKey') || process.env.OPENROUTER_API_KEY;
    }
}
