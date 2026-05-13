# CodeSphere MVP Gap Analysis

**Scope:** `feature/ai-native-core` as of `0eaf4d1` (2026-05-12). Compares the working state of the AI-native extension and patch pipeline against a minimum viable demo: *"User installs CodeSphere, sets an OpenRouter key, sends a chat message, gets a streamed response."*

**Status read:** The chat happy-path works on a developer machine if NODE_ENV=production and the OpenRouter key is set. Everything outside that narrow path is either stubbed, fragile, or contradicted elsewhere in the codebase. The architectural docs (UPCM, daemon protocol, GOS) describe a system that is roughly 20% implemented.

---

## MVP definition (assumed)

| Requirement | Why it's MVP |
| --- | --- |
| Built binary launches with the AI sidebar visible | Demonstrates the build pipeline ships the extension. |
| User sets OpenRouter API key via command palette | Auth is required for any LLM call. |
| User sends a chat message and receives a response | Validates the UI ↔ host ↔ provider path end-to-end. |
| Response renders incrementally (perceived streaming) | Differentiator vs. a plain `fetch`. |
| Both sidebar tabs (Chat, Context) render their distinct UIs | Confirms multi-view wiring works. |
| Build (`stable-linux`, `stable-windows`, `stable-macos`) completes green | Repeatable distribution. |

**Out of MVP scope (deferred):** real daemon, semantic indexing, context auto-population, cancellation, multi-turn, governance trace UI, patch DAG enforcement.

---

## P0 — Blocks build or first-run smoke

### 1. `ts-node` is not available at build time

**Where:** [prepare_vscode.sh:177](prepare_vscode.sh) (feature branch) runs:

```bash
ts-node ../scripts/validate_patches.ts || { echo "Patch validation failed. Aborting build."; exit 1; }
```

**Problem:** Root [package.json](package.json) only declares `png2icons`. `ts-node` lives in `extensions/codesphere-ai-native/devDependencies` but is not on PATH when `prepare_vscode.sh` runs from the repo root. CI build will exit 1 before any patch is applied.

**Fix:** Either (a) compile `validate_patches.ts` to `.js` in source and run with `node`, (b) add `ts-node` + `typescript` to root devDependencies and `npm install` it before this step, or (c) `npx --yes ts-node` (still needs registry access in CI).

### 2. `validate_patches.ts` is theatrical, not a real gate

**Where:** [scripts/validate_patches.ts](scripts/validate_patches.ts)

**Problem:** The validator hardcodes **two** sample `PatchDescriptor` entries (`core/telemetry`, `ai/daemon-inject`) directly in the script body. The comment says *"In a real system, these would be loaded from `.patch.json` files"* — those files don't exist. The repo has ~37 real patches across `patches/{core,branding,feat,fix,ai}/`, none of which are described. The "build-time governance" layer of the UPCM is not enforced.

**Fix for MVP:** Either (a) drop the validator call from `prepare_vscode.sh` until it's real, or (b) generate `.patch.json` descriptors next to each patch with `affects:` derived from `grep '^+++ b/' *.patch`.

### 3. EventBus throws on every governance violation when `NODE_ENV !== 'production'`

**Where:** [extensions/codesphere-ai-native/src/core/EventBus.ts:54-57](extensions/codesphere-ai-native/src/core/EventBus.ts)

```ts
if (process.env.NODE_ENV !== 'production') {
    throw new Error(violation.message);
}
```

**Problem:** VS Code's extension host does not set `NODE_ENV=production` by default. Any payload that fails Zod or hits an unknown topic crashes the extension's activation chain. The first time a user does something the registry hasn't seen, the AI sidebar dies silently from the user's perspective.

**Fix:** Use `process.env.CODESPHERE_DEV === '1'` (opt-in) for the throw, or default to `console.error` + return `false` and surface the violation through the trace store.

### 4. Context Manager will throw the moment it emits

**Where:**
- [extensions/codesphere-ai-native/src/core/Governance.ts:50](extensions/codesphere-ai-native/src/core/Governance.ts) — `context/add` schema accepts `type: 'file' | 'symbol' | 'snippet'`
- [extensions/codesphere-ai-native/webview-ui/src/ContextManager.tsx:8](extensions/codesphere-ai-native/webview-ui/src/ContextManager.tsx) — UI declares `type: 'file' | 'folder' | 'selection'`

**Problem:** Schema mismatch. If the UI ever posts a `context/add` with `'folder'` or `'selection'`, Zod fails → EventBus blocks → in dev, EventBus throws (P0 #3). Currently the UI never emits, so the bug is latent, but it lands the moment anyone wires the "+" button.

**Fix:** Pick one vocabulary. Recommend `'file' | 'folder' | 'selection' | 'symbol' | 'snippet'` and update both sides — UX terminology beats theoretical purity here.

### 5. `appInsights` keys reintroduced

**Where:** Feature branch [product.json:67-72](product.json)

```json
"appInsights": { "instrumentationKey": "" },
"appInsightsVortex": { "instrumentationKey": "" }
```

**Problem:** Empty keys disable telemetry, but their presence revives the Application Insights code paths that the telemetry patches are trying to neuter. For a project whose stated value prop is "Microsoft telemetry disabled" this is a regression smell. Cross-check against [patches/core/telemetry.patch](patches/core/telemetry.patch) to confirm the empty-key short-circuit holds across upstream changes.

### 6. The daemon doesn't exist but the host launches it on startup

**Where:** [patches/ai/zz-inject-ai-daemon.patch](patches/ai/zz-inject-ai-daemon.patch) → `src/vs/code/electron-main/app.ts`

```ts
require('child_process').spawn(
    require('path').join(this.environmentMainService.appRoot, '..', '!!BINARY_NAME!!-daemon'),
    [], { detached: true, stdio: 'ignore' }
).unref();
```

**Problem:**
- No build target produces a `codesphere-daemon` binary.
- The stub at [scratch/codesphere-daemon-stub.js](scratch/codesphere-daemon-stub.js) is plain HTTP on port 8080 — the [docs/daemon-protocol.md](docs/daemon-protocol.md) spec says JSON-RPC 2.0 over WebSocket. Nothing references the stub.
- Path layout is wrong for macOS (`appRoot` is `Contents/Resources/app`; helper binaries ship under `Contents/MacOS/` or `Contents/Helpers/`) and missing `.exe` on Windows.
- The error is caught and logged, so the app won't crash — but every launch produces a startup error in logs.

**Fix for MVP:** Remove [patches/ai/zz-inject-ai-daemon.patch](patches/ai/zz-inject-ai-daemon.patch) until there's a real daemon. The current AI flow doesn't need it — `AiService` talks to OpenRouter directly from the extension host.

---

## P1 — Required for a usable MVP

### 7. Streaming is faked

**Where:** [extensions/codesphere-ai-native/src/domains/chat/ai-service.ts:60](extensions/codesphere-ai-native/src/domains/chat/ai-service.ts)

```ts
stream: false
```

then `emitStreamingResponse` splits the complete response by words and emits `chat/delta` every 15 ms.

**Problem:** Time-to-first-token is the full response latency. For long completions (gpt-oss-120b on a complex prompt) the user stares at a blank pane for many seconds. Defeats the "perceived streaming" MVP goal.

**Fix:** Switch to `stream: true` and parse SSE. The webview side already handles incremental `chat/delta` correctly.

### 8. No cancellation

**Where:** `AiService.handleChatSend` has no cancellation argument; `chat/stop` topic from [docs/daemon-protocol.md](docs/daemon-protocol.md) is not registered in [Governance.ts](extensions/codesphere-ai-native/src/core/Governance.ts).

**Problem:** Once a generation starts, the user can't stop it. With real streaming (P1 #7) this becomes painful immediately.

**Fix:** Add `chat/stop` to the registry with `allowedEmitters: ['ui']`; pass `AbortController.signal` from `ChatSidebarProvider` to `AiService.handleChatSend`; cancel `fetch` on signal.

### 9. Single-turn only — no conversation history

**Where:** [ai-service.ts:46-58](extensions/codesphere-ai-native/src/domains/chat/ai-service.ts)

**Problem:** Every request sends `[system, user]` only. No prior assistant messages. The UI shows a thread but the model sees one isolated turn each time. "Follow-up question" — the most common chat pattern — silently fails.

**Fix:** Webview already keeps `messages[]` state. Either (a) send the full message history with each `chat/send`, or (b) keep history in the host and key by webview-instance id.

### 10. No third-party-data-exit disclosure

**Where:** activation flow in [extension.ts](extensions/codesphere-ai-native/src/extension.ts)

**Problem:** The first time a user hits Send, their code/text goes to OpenRouter. For a project marketed on telemetry/privacy, this needs a first-run consent — at minimum a one-time "Your messages will be sent to OpenRouter.ai using your API key. Continue?" modal.

**Fix:** Add a `codesphere.ai.consentGranted` global state flag; gate `AiService.handleChatSend` on first use; surface via VS Code's `showInformationMessage` with a "Don't ask again" + "Learn more" link to docs.

### 11. Context Manager has no data source

**Where:** [ContextSidebarProvider.ts](extensions/codesphere-ai-native/src/domains/context/ContextSidebarProvider.ts) listens for `context/add` but **nothing in the host emits it**.

**Problem:** The Context tab will display "No active context" forever in MVP. Also, even if the user could chat with context, `AiService` doesn't read context items into the prompt.

**Fix for MVP:** Either (a) descope Context UI from MVP (hide the view) or (b) wire the simplest possible source — emit `context/add` for the active editor's file URI on `vscode.window.onDidChangeActiveTextEditor`, and have `AiService` include the active file's selected text in the user prompt.

### 12. No tests in CI

**Where:** [.github/workflows/](.github/workflows/) — none invoke `npm run test:unit` or `vitest`.

**Problem:** The 4 EventBus tests don't gate anything. New patches that break governance won't surface until manual smoke.

**Fix:** Add a `validate-extension` job to each stable workflow that runs `npm ci && npm test` inside `extensions/codesphere-ai-native` before the heavy `prepare_vscode.sh` step.

---

## P2 — Architecture promises not delivered

The design docs ([docs/governance-upcm.md](docs/governance-upcm.md), [docs/daemon-protocol.md](docs/daemon-protocol.md), [docs/design/ai-native-research-plan.md](docs/design/ai-native-research-plan.md)) describe systems that don't exist. None of these block MVP, but they will mislead anyone reading the docs.

### 13. No daemon negotiation handshake

UPCM mandates `sys/negotiate_req` / `sys/negotiate_res`. Governance registry has `sys/negotiate` (different name, no req/res split). Nothing emits it. `sys/snapshot` is registered but never used.

### 14. GOS Trace Pipeline is write-only

[Observability.ts](extensions/codesphere-ai-native/src/core/Observability.ts) — `TraceStore.query` / `getRecent` exist but nothing reads them. No trace-viewer UI. The "self-inspection brain of the platform" produces no observable output.

### 15. `CodeSphereEvent` union ↔ Registry drift

[protocol.ts:43-47](extensions/codesphere-ai-native/src/types/protocol.ts) declares `status/update` in the event union. [Governance.ts](extensions/codesphere-ai-native/src/core/Governance.ts) has no contract for it. Any code emitting `status/update` would be rejected (and crash in dev per P0 #3).

### 16. Patch class ordering is implicit

[prepare_vscode.sh](prepare_vscode.sh) applies patches in class order `core → branding → feat → ai`, but this is hardcoded in the loop. UPCM describes a true DAG with per-patch `dependencies: []`. Cross-class dependencies (e.g., an `ai/` patch that needs a `feat/` patch first) aren't expressible.

---

## P3 — Fit and finish

### 17. README links target a non-existent repo

[README.md](README.md) badges and most links point at `CodeSphere/CodeSphere`. The real repo is `CodeSphere/codesphere-IDE` (matches [product.json:55](product.json) `licenseUrl`). All CI badges and release links 404. Same applies to [docs/index.md](docs/index.md).

### 18. Three escalating rebrand scripts at root

[mass_rebrand.ps1](mass_rebrand.ps1), [mass_rebrand_super.ps1](mass_rebrand_super.ps1), [mass_rebrand_nuclear.ps1](mass_rebrand_nuclear.ps1) — naming suggests iterative experiments. Consolidate or delete.

### 19. Scratch/audit artifacts committed

[repo_files.txt](repo_files.txt) (75 KB), [audit_win32.txt](audit_win32.txt), [win32_icos.txt](win32_icos.txt), [icon_log.txt](icon_log.txt), [ico_err.txt](ico_err.txt) (empty), [found_legacy.txt](found_legacy.txt) (empty), and the `*_legacy_files.txt` shards look like one-shot script outputs. Move to `.gitignore`.

### 20. Webview UI nested install on every build

[prepare_vscode.sh](prepare_vscode.sh) runs `npm install && npm run package` per extension; `package` runs `build:webview` which `cd webview-ui && npm install && npm run build`. React 19 + Vite + Tailwind + Vitest reinstalled from scratch on every CI run. Slow.

**Fix:** Cache `node_modules` via `actions/cache` keyed on `package-lock.json` hashes. Or pre-build the webview and commit `webview-ui/build/` as a generated asset (less ideal).

### 21. `disable-update.patch.yet` rename only handles new path

[prepare_vscode.sh:181](prepare_vscode.sh) renames `patches/core/disable-update.patch.yet`. Old workflows or external tooling that globbed `patches/*.patch` won't see the `core/` reorganization. No external glob seems to exist in this repo, but worth noting for anyone with downstream tooling.

### 22. Bundle-id drift risk

[prepare_vscode.sh](prepare_vscode.sh) hardcodes Windows AppIDs/GUIDs in two places (stable/insider). If the IDs ever change, both copies must update. Consider externalizing into [src/stable/product.json](src/stable/) and [src/insider/product.json](src/insider/) so they're declarative.

---

## Test coverage gap inventory

What has tests:
- `EventBus.test.ts` — 4 cases (emit, multi-sub, unsub, governance throw)

What has **zero** test coverage:
- `AiService` (OpenRouter request, error paths, key resolution)
- `GovernanceEnforcer` (Zod failure cases, unknown topic, unauthorized emitter)
- `ChatSidebarProvider` / `ContextSidebarProvider` (webview wiring, dispose cleanup)
- `TraceStore` (eviction at 1000, query filters)
- `ObservabilityService` (snapshot composition)
- Webview-ui `App.tsx`, `ContextManager.tsx`, `useVSCode` hook
- The OpenRouter integration itself (no recorded fixture / no mock server)

`webview-ui/src/__tests__/App.test.tsx` exists per the file list — verify it's non-trivial; the file infrastructure is wired (vitest + jsdom + testing-library) but I didn't open the test file.

---

## Recommended sequence to ship MVP

In priority order, expecting each batch to be roughly a day of work:

1. **Unblock the build** — fix P0 #1 (ts-node), descope P0 #2 (drop validator call) and P0 #6 (drop daemon patch).
2. **Stop crashing on edge events** — fix P0 #3 (no-throw default).
3. **Make Chat correct** — fix P1 #7 (real streaming), P1 #9 (history), P1 #10 (consent).
4. **Decide Context scope** — either descope (hide Context view in [package.json](extensions/codesphere-ai-native/package.json)) or do the minimal source from P1 #11. Either way, fix P0 #4 (type alignment).
5. **Verify in CI** — fix P1 #12 (run tests), then iterate.
6. **Address P2/P3** — only after MVP is shipping. The design promises can be honored or relaxed in a follow-up RFC, but should not block first release.

The architectural ambition in `feature/ai-native-core` is real and well-thought-out. The gap between ambition and implementation is normal at this stage. MVP can ship without the daemon, the patch DAG, or the GOS UI — those are 1.x features, not 1.0.
