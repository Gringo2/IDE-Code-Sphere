import { globalEventBus } from './EventBus';
import { ChatDelta } from '../types/protocol';

export class AiService {
    private static readonly DAEMON_URL = 'http://localhost:8080/chat';

    public static async handleChatSend(text: string): Promise<void> {
        console.log(`[AiService] Handling chat/send: ${text}`);

        try {
            // Attempt to call the native daemon
            // (Using fetch or http - since we are in node environment, we use native http or a lib)
            // For now, let's keep the mock streaming but log the intent
            console.log(`[AiService] Would call daemon at ${this.DAEMON_URL}`);
        } catch (e) {
            console.error(`[AiService] Daemon unreachable, using internal fallback`);
        }

        // Mock streaming response
        const messageId = Math.random().toString(36).substring(7);
        const words = `This is a mock response from the CodeSphere AI platform architecture. I am currently operating as a stub service, but soon I will be connected to the native AI daemon. You sent: "${text}"`.split(' ');

        for (let i = 0; i < words.length; i++) {
            // Artificial delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const delta: ChatDelta = {
                id: messageId,
                delta: words[i] + ' ',
                done: i === words.length - 1
            };

            globalEventBus.emit('chat/delta', delta);
        }
    }
}
