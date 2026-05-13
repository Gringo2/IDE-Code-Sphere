# CodeSphere AI — User Stories (Draft)

> **Status: starter draft.** Personas, prioritization, and the value-prop framing in §1 are best-guesses by an outside reader of the codebase. Before this doc is canonical, the project owner should rewrite §1 in their own voice. The stories themselves are grounded in the implementation as of branch `claude/mvp-p0-fixes` (PR #1) and the architectural promises in [governance-upcm.md](../governance-upcm.md), [daemon-protocol.md](../daemon-protocol.md), and [ai-native-research-plan.md](./ai-native-research-plan.md).

## 1. Product thesis (needs owner review)

CodeSphere is a FLOSS rebuild of VS Code with a **bundled AI assistant** that operates without sending telemetry to Microsoft and (eventually) without requiring a cloud round-trip for every operation. The differentiator from Cursor / Continue / Cline / Copilot Chat is:

- **Bundled, not optional.** AI is a first-class part of the IDE, not an extension a user has to discover and configure.
- **Governance-first.** Every event between UI, host, and daemon is contractually enforced; data exits are explicit and consented.
- **Pluggable runtime.** Today the host calls OpenRouter directly; the design promises a local daemon that can host alternative models, indexing, and terminal awareness.

> **❓ Owner: confirm or rewrite.** Is "bundled, FLOSS, governance-first" the right frame? Are we differentiating on privacy, on local-first, on extensibility, or on something else? The persona choices below assume privacy + control are primary motivations.

## 2. Personas

### P1: "Mira" — privacy-conscious indie developer
- Builds side projects on weekends. Chose CodeSphere specifically because they don't want to install VS Code (telemetry) or pay for Copilot.
- Has an OpenRouter account they already use for other tools. Doesn't trust closed editors.
- Will tolerate rough UX in exchange for transparency about what their tool sends where.

### P2: "Diego" — senior backend dev evaluating tools for a 12-person team
- Owns a polyglot service repo (Go + TypeScript + Terraform). Their org has rejected Copilot for compliance reasons.
- Needs to demo a tool to leadership in two weeks. Looking for "good enough" + a credible roadmap, not perfection.
- Values: predictable behavior, no surprise data exits, ability to swap models.

### P3: "Asha" — junior dev / new to a codebase
- Joined a team six weeks ago. Spends most of their day reading unfamiliar code.
- Uses chat primarily to ask "what does this do?" and "why is this written this way?".
- Will give up on a tool the first time it fails confusingly. Needs hand-holding on first run.

> **❓ Owner: are these the right three?** Missing personas to consider: enterprise dev with air-gapped requirements (motivates the daemon), AI researcher wanting to swap in a local model, content creator demoing IDE workflows on screen. Add/remove as needed.

## 3. Stories

Each story carries:
- **State**: ✅ shipped • 🟡 partial • 🟦 planned • 🔴 contradicted by current build
- **Acceptance**: what "done" looks like
- **Notes**: gaps, risks, or design questions

### 3.1 First-time setup

**S1 — Configure my OpenRouter key the first time I open the AI sidebar.** *(P3, P1)*
- *As Asha, I want to be told how to get started when I open the AI sidebar with no API key configured, so I don't get a confusing error on my first message.*
- **State: 🟡 partial.** A key can be set via `CodeSphere AI: Set OpenRouter API Key` command. But if the user just types a message without configuring, they get an in-chat error string: *"No OpenRouter API key is configured. Run [command]…"*. There's no inline CTA, no button, no first-run hint.
- **Acceptance:**
  - Opening the empty AI sidebar with no key shows a "Set up your key" panel with a button that runs the command.
  - The "Send" button is disabled (with tooltip) until a key exists.
- **Notes:** This is the single highest-impact onboarding fix.

**S2 — Understand what gets sent to OpenRouter before my first message.** *(P1, P2)*
- *As Mira, I want a clear, one-time disclosure of what data leaves my machine before I send my first message, so I can give informed consent.*
- **State: ✅ shipped.** First-run modal: "CodeSphere AI sends your chat messages — including conversation history — to OpenRouter (openrouter.ai)…" Three options (Allow / Learn more / Dismiss). `codesphere.ai.resetOpenRouterConsent` revokes.
- **Acceptance:** ✅ already met. Wording reviewed by privacy-sensitive person.
- **Notes:** When context items (active file) become part of the payload, the disclosure should be updated to mention that. As of P1-11, the active file is sent — wording should reflect this.

### 3.2 Core chat loop

**S3 — Ask a question and get a streaming answer with current file context.** *(P3, P1, P2)*
- *As Asha, I want to ask "what does this function do?" and get a streaming explanation that references the file I'm looking at, so I don't have to paste code in.*
- **State: 🟡 partial.** Streaming works (✅, verified 59 chunks over 1.3s). Active file is attached (✅). But:
  - Response renders as **plain text** — markdown formatting and code blocks come back literal.
  - No syntax highlighting in code suggestions.
  - File content is truncated at 4 KB; large files lose detail silently.
  - Selected text isn't prioritized over file content.
- **Acceptance:**
  - Responses render markdown with code blocks syntax-highlighted.
  - When the user has a selection, the selection is what's attached (not the whole file).
  - File-too-large case shows a hint ("only first 4 KB attached").

**S4 — Continue a conversation across multiple turns.** *(P3, P2)*
- *As Asha, I want my follow-up question to remember my previous question, so I can drill in without re-pasting context.*
- **State: 🟡 partial.** Multi-turn history works (✅, governed by schema, trimmed at 40 turns). But:
  - Reloading the webview (or restarting the IDE) **loses all history**. State lives in React only.
  - No way to start a new chat without reloading.
  - No way to see past conversations.
- **Acceptance:**
  - History persists across IDE restarts (use `vscode.Memento` or webview `setState`).
  - "New chat" button in the header clears the thread.
  - (Roadmap: list of past conversations, named, searchable.)

**S5 — Stop a long response mid-stream.** *(P1, P2)*
- *As Mira, when I realize the assistant is going off the rails, I want to stop it immediately to save API spend and time.*
- **State: ✅ shipped.** Red Stop button replaces Send during streaming; abort propagates to `fetch()` via `AbortController`; `chat/stop` governed in registry.
- **Acceptance:** ✅ met.
- **Notes:** Verified algorithmically in tests; visual swap and abort propagation still need interactive smoke.

### 3.3 Code-aware actions (the "deeply integrated" promise)

**S6 — Explain the code I've selected.** *(P3, P1)*
- *As Asha, I want to right-click a selection and pick "Explain", so I don't have to leave the editor.*
- **State: 🔴 not built.** Extension manifest declares the value prop ("Deeply integrated AI capabilities") but ships zero editor commands beyond `helloWorld`, `setOpenRouterKey`, and `resetOpenRouterConsent`.
- **Acceptance:**
  - Right-click menu on selection has at least: "Explain selection", "Refactor selection", "Generate test for selection".
  - Each opens the chat sidebar pre-filled with the selection as context.
- **Notes:** This is the biggest gap between marketing and reality. Differentiator vs. Copilot Chat depends on this.

**S7 — Fix the error squiggle.** *(P1, P2)*
- *As Diego, I want to hover an error and click "Ask AI to fix this", so I can evaluate AI-assisted debugging in the demo.*
- **State: 🔴 not built.**
- **Acceptance:**
  - Code Action (lightbulb) appears on lines with diagnostics.
  - Selecting it sends the diagnostic + surrounding code to chat and asks for a fix.

**S8 — Apply a suggested code change without copy-pasting.** *(P3, P2)*
- *As Asha, when the AI suggests a code change, I want to apply it with one click, rather than copy-paste-edit.*
- **State: 🔴 not built.** Responses are read-only chat content.
- **Acceptance:**
  - Code blocks in responses have an "Apply" affordance.
  - "Apply" opens a diff view with accept/reject (matching VS Code's existing "inline edit" UX).

### 3.4 Context management

**S9 — See what context the AI has at any moment.** *(P1, P2)*
- *As Mira, I want to see exactly which files and snippets are being sent to the model, so I'm never surprised.*
- **State: 🟡 partial.** The Context Manager sidebar shows the active file. But:
  - Switching editors *adds* to the list instead of *replacing* — visible list grows forever.
  - The "+ " button is decorative; no way to add custom context.
  - The "X" button removes from the visible list but not from what's actually sent (ContextService is the truth, the UI lies).
- **Acceptance:**
  - List shows exactly what gets sent (UI and source of truth agree).
  - User can manually attach files, folders, or snippets.
  - User can remove items.

**S10 — Have the assistant search my workspace before answering.** *(P2)*
- *As Diego, I want to ask "where is `UserRepository` instantiated?" and have the assistant grep my codebase, not just my open file.*
- **State: 🟦 planned.** [docs/daemon-protocol.md](../daemon-protocol.md) defines `index/` namespace methods. None implemented. No semantic index built.
- **Acceptance:**
  - Daemon (P2 architectural work) maintains a workspace symbol/text index.
  - Chat can resolve `where is X` and similar queries against it.
- **Notes:** This is daemon-shaped work — significant lift.

### 3.5 Trust and control

**S11 — Switch models without editing JSON.** *(P2, P1)*
- *As Diego, I want to pick from a dropdown of models in the AI sidebar, so I can compare GPT-4 / Claude / open models without leaving the IDE.*
- **State: 🔴 not built.** Model picker lives in `settings.json` (`codesphere.ai.openRouterModel`). The Settings icon in the chat header is decorative.
- **Acceptance:**
  - Settings icon opens an in-sidebar panel with model dropdown.
  - Recently used models surfaced at the top.

**S12 — Inspect what the governance layer is doing.** *(P2)*
- *As Diego (during evaluation), I want to see a log of what events were blocked and why, so I trust the platform.*
- **State: 🟦 planned, 🔴 invisible.** [Observability.ts](../../extensions/codesphere-ai-native/src/core/Observability.ts) (`TraceStore`) collects every emission as an `EventTrace`. Zero UI reads it. The "GOS Trace Pipeline" is write-only.
- **Acceptance:**
  - New developer-facing view ("Governance Trace") shows recent events, blocked emissions, and reasons.

### 3.6 Privacy-as-a-feature

**S13 — Use the AI without sending data to any cloud.** *(P1, P2)*
- *As Mira, I want a local-only mode that uses an on-device model, so I can work offline / on confidential code.*
- **State: 🔴 not built.** All paths go to OpenRouter. Daemon-as-local-runtime exists in design docs only ([daemon-protocol.md](../daemon-protocol.md)).
- **Acceptance:**
  - Daemon supports a local-model backend (e.g., Ollama).
  - Setting toggles cloud / local.
  - When in local mode, the consent modal flips to "data stays on your machine."
- **Notes:** Largest gap between the docs and reality. This is the daemon project (P2 in the gap analysis).

## 4. Coverage matrix

| Story | Implemented | Markdown render | Persistence | Editor-aware | Daemon |
|---|---|---|---|---|---|
| S1 First-key setup | 🟡 | – | – | – | – |
| S2 Consent disclosure | ✅ | – | ✅ | – | – |
| S3 Streaming chat + file context | 🟡 | ❌ | ❌ | partial | – |
| S4 Multi-turn | 🟡 | – | ❌ | – | – |
| S5 Stop streaming | ✅ | – | – | – | – |
| S6 Explain selection | 🔴 | – | – | needed | – |
| S7 Fix diagnostic | 🔴 | – | – | needed | – |
| S8 Apply suggestion | 🔴 | – | – | needed | – |
| S9 Context visibility | 🟡 | – | partial | – | – |
| S10 Workspace search | 🟦 | – | – | – | needed |
| S11 Model picker | 🔴 | – | – | – | – |
| S12 Trace UI | 🟦 | – | – | – | – |
| S13 Local-only mode | 🔴 | – | – | – | needed |

## 5. Alpha-tier mapping

Cross-reference with [mvp-gap-analysis.md](./mvp-gap-analysis.md):

- **Internal alpha (T1)** — stories S2, S3 (functional, not pretty), S4 (volatile), S5 work. Disclose S6/S7/S8/S11/S13 as "not in this build."
- **Friendly external alpha (T2)** — adds: fix S1, fix S3 markdown rendering, fix S4 persistence, fix S9 accumulation bug, remove decorative icons (or wire them).
- **Public alpha (T3)** — adds: S6, S7, S11 (model picker), basic S12 (trace UI), documented telemetry opt-in for usage signals.

## 6. Open questions for the owner

1. **Is the differentiator privacy/control (assumes local-first), extensibility (assumes plugin marketplace), or "AI as a first-class IDE citizen" (assumes deep editor integration)?** This determines whether the next sprint should be S13 (daemon), S11 (model picker / settings UI), or S6–S8 (editor actions).
2. **What's the model story?** Is gpt-oss-120b on OpenRouter the canonical default, or is that a placeholder? Does the team have an opinion on Claude / GPT-4 / DeepSeek as defaults?
3. **What's the conversation persistence boundary?** Per-workspace (in `.codesphere/`)? Per-user (in `globalState`)? Sync via account? The answer drives a different storage design.
4. **Is the Context Manager view actually useful, or should it be folded into the chat sidebar as a small attachments strip?** Real product question — the current dual-tab IA might be over-engineered.
5. **Who is the user we're optimizing for in v1?** Mira / Diego / Asha are guesses. Pick one. The others get hands-on later.
