import * as vscode from 'vscode';
import { globalEventBus } from '../../core/EventBus';
import { ChatDelta, PROTOCOL_VERSION } from '../../types/protocol';

export class AiService {
    private static readonly OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(private readonly secrets: vscode.SecretStorage) { }

    public async handleChatSend(text: string): Promise<void> {
        console.log(`[AiService] Handling chat/send: ${text}`);

        try {
            const content = await this.createOpenRouterCompletion(text);
            await this.emitStreamingResponse(content);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[AiService] OpenRouter request failed: ${message}`);
            await this.emitStreamingResponse(`OpenRouter request failed: ${message}`);
        }
    }

    private async createOpenRouterCompletion(text: string): Promise<string> {
        const apiKey = await this.getOpenRouterApiKey();
        if (!apiKey) {
            throw new Error('No OpenRouter API key is configured. Run "CodeSphere AI: Set OpenRouter API Key" from the command palette.');
        }

        const model = vscode.workspace
            .getConfiguration('codesphere.ai')
            .get<string>('openRouterModel', 'openai/gpt-oss-120b');

        const response = await fetch(AiService.OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/CodeSphere/codesphere-IDE',
                'X-Title': 'CodeSphere AI Native'
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are CodeSphere AI, a concise coding assistant embedded in CodeSphere IDE.'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter returned ${response.status}: ${errorText.slice(0, 300)}`);
        }

        const payload = await response.json() as {
            choices?: Array<{
                message?: {
                    content?: string;
                };
            }>;
        };

        const content = payload.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('OpenRouter returned an empty response.');
        }

        return content;
    }

    private async getOpenRouterApiKey(): Promise<string | undefined> {
        return await this.secrets.get('codesphere.openRouterApiKey') || process.env.OPENROUTER_API_KEY;
    }

    private async emitStreamingResponse(content: string): Promise<void> {
        const messageId = Math.random().toString(36).substring(7);
        const words = content.split(/(\s+)/).filter(Boolean);

        for (let i = 0; i < words.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 15));
            
            const delta: ChatDelta = {
                id: messageId,
                delta: words[i],
                done: i === words.length - 1,
                version: PROTOCOL_VERSION
            };

            globalEventBus.emit('chat/delta', delta, 'chat');
        }
    }
}
