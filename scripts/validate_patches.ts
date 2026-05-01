import * as fs from 'fs';
import * as path from 'path';

interface PatchDescriptor {
    id: string;
    class: 'core' | 'branding' | 'feat' | 'ai';
    dependencies: string[];
    affects: string[];
}

/**
 * Patch Conflict & Dependency Validator.
 * Fulfills the UPCM requirement for Build-Time governance.
 */
class PatchValidator {
    private patches: Map<string, PatchDescriptor> = new Map();

    public register(descriptor: PatchDescriptor) {
        this.patches.set(descriptor.id, descriptor);
    }

    public validate() {
        console.log(`[PatchValidator] Starting pre-flight check...`);
        
        for (const [id, patch] of this.patches) {
            // Check dependencies
            for (const depId of patch.dependencies) {
                if (!this.patches.has(depId)) {
                    throw new Error(`[PatchValidator] Missing dependency: '${id}' requires '${depId}'`);
                }
            }

            // Check file conflicts (simplified)
            for (const otherId of this.patches.keys()) {
                if (id === otherId) continue;
                const other = this.patches.get(otherId)!;
                
                const intersection = patch.affects.filter(f => other.affects.includes(f));
                if (intersection.length > 0) {
                    console.warn(`[PatchValidator] Warning: '${id}' and '${otherId}' overlap on files: ${intersection.join(', ')}`);
                }
            }
        }

        console.log(`[PatchValidator] ✅ All patch invariants satisfied.`);
    }
}

// Example instantiation (In a real system, these would be loaded from .patch.json files)
const validator = new PatchValidator();

validator.register({
    id: 'core/telemetry',
    class: 'core',
    dependencies: [],
    affects: ['src/vs/platform/telemetry/common/telemetryService.ts']
});

validator.register({
    id: 'ai/daemon-inject',
    class: 'ai',
    dependencies: ['core/telemetry'],
    affects: ['src/vs/workbench/electron-sandbox/desktop.main.ts']
});

try {
    validator.validate();
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
}
