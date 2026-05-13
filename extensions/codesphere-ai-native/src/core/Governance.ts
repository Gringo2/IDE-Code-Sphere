import { z } from 'zod';
import { RuntimeRole, PROTOCOL_VERSION } from '../types/protocol';
import { GovernanceViolation } from './Observability';

/**
 * The Domain Identity system.
 * Prevents "Event Soup" by enforcing ownership.
 */
export type Domain = 'chat' | 'context' | 'sys' | 'ui' | 'host';

export interface EventContract {
    topic: string;
    owner: Domain;
    allowedEmitters: Domain[];
    schema: z.ZodSchema;
}

/**
 * Strict Event Registry.
 * If an event isn't here, it cannot be emitted on the GlobalEventBus.
 */
export const EventRegistry: Record<string, EventContract> = {
    'chat/send': {
        topic: 'chat/send',
        owner: 'chat',
        allowedEmitters: ['ui'],
        schema: z.object({
            text: z.string(),
            history: z.array(z.object({
                role: z.enum(['user', 'assistant', 'system']),
                content: z.string()
            })).optional(),
            version: z.string().default(PROTOCOL_VERSION)
        })
    },
    'chat/delta': {
        topic: 'chat/delta',
        owner: 'chat',
        allowedEmitters: ['chat'],
        schema: z.object({
            id: z.string(),
            delta: z.string(),
            done: z.boolean().optional(),
            version: z.string().default(PROTOCOL_VERSION)
        })
    },
    'chat/stop': {
        topic: 'chat/stop',
        owner: 'chat',
        allowedEmitters: ['ui'],
        schema: z.object({
            id: z.string().optional(),
            version: z.string().default(PROTOCOL_VERSION)
        })
    },
    'context/add': {
        topic: 'context/add',
        owner: 'context',
        allowedEmitters: ['ui', 'host'],
        schema: z.object({
            uri: z.string(),
            content: z.string().optional(),
            type: z.enum(['file', 'folder', 'selection', 'symbol', 'snippet']),
            version: z.string().default(PROTOCOL_VERSION)
        })
    },
    'context/update': {
        topic: 'context/update',
        owner: 'context',
        allowedEmitters: ['context', 'host'],
        schema: z.object({
            uri: z.string(),
            content: z.string().optional(),
            type: z.enum(['file', 'folder', 'selection', 'symbol', 'snippet']),
            version: z.string().default(PROTOCOL_VERSION)
        })
    },
    'sys/negotiate': {
        topic: 'sys/negotiate',
        owner: 'sys',
        allowedEmitters: ['ui', 'host', 'chat'],
        schema: z.object({
            contract: z.any(), // Further refined in implementation
            timestamp: z.number()
        })
    },
    'sys/snapshot': {
        topic: 'sys/snapshot',
        owner: 'sys',
        allowedEmitters: ['sys', 'host'],
        schema: z.object({
            uptime: z.number(),
            violationCount: z.number()
        })
    }
};

export class GovernanceEnforcer {
    /**
     * Validates an event against the UPCM registry.
     * Returns a violation object if unauthorized or malformed.
     */
    public static validateEmission(topic: string, data: any, emitter: Domain): GovernanceViolation | null {
        const contract = EventRegistry[topic];
        
        if (!contract) {
            return {
                ruleId: 'UPCM-001',
                domain: emitter,
                reasonCode: 'UNKNOWN_TOPIC',
                message: `Unauthorized event topic: ${topic}. No contract exists.`
            };
        }

        if (!contract.allowedEmitters.includes(emitter)) {
            return {
                ruleId: 'UPCM-002',
                domain: emitter,
                reasonCode: 'UNAUTHORIZED_EMITTER',
                message: `Domain '${emitter}' is not authorized to emit '${topic}'. Owner is '${contract.owner}'.`
            };
        }

        const result = contract.schema.safeParse(data);
        if (!result.success) {
            return {
                ruleId: 'UPCM-003',
                domain: emitter,
                reasonCode: 'INVALID_PAYLOAD',
                message: `Payload validation failed for '${topic}': ${result.error.message}`
            };
        }

        return null;
    }
}
