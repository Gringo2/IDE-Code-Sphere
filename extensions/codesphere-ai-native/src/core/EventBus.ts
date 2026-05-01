export type EventCallback<T = any> = (data: T) => void;

export class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    public on<T>(topic: string, callback: EventCallback<T>): void {
        if (!this.listeners.has(topic)) {
            this.listeners.set(topic, new Set());
        }
        this.listeners.get(topic)!.add(callback);
    }

    public off<T>(topic: string, callback: EventCallback<T>): void {
        const topicListeners = this.listeners.get(topic);
        if (topicListeners) {
            topicListeners.delete(callback);
            if (topicListeners.size === 0) {
                this.listeners.delete(topic);
            }
        }
    }

    public emit<T>(topic: string, data: T): void {
        const topicListeners = this.listeners.get(topic);
        if (topicListeners) {
            topicListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in EventBus listener for ${topic}:`, error);
                }
            });
        }
    }

    public clear(): void {
        this.listeners.clear();
    }
}

// Singleton instance
export const globalEventBus = new EventBus();
