# T1 — Internal Alpha Tester Pack

**Audience:** 3–5 developers you already know personally. Not the public. This pack assumes you've already produced a CodeSphere build and are about to distribute it.

**Goal of T1:** Validate whether the AI experience actually helps with real coding work — *not* validate the UX polish. The known-limitations notice (§2) explicitly tells testers to ignore the polish gaps and direct their feedback at the AI behavior itself.

**Time budget:** 1 week of feedback collection. Anything longer drifts into asking testers to do your QA.

---

## 1. Before you send anything

A checklist for you (the owner) before pinging testers.

- [ ] You've completed the manual smoke from PR #1: chat works, streaming visible, stop button works, Context Manager shows the active file, consent modal appears on first send, history persists within a single session.
- [ ] Your OpenRouter account has enough credit for ~5 testers × ~50 messages × ~$0.001/msg = budget ~$1–5. Set a spending cap.
- [ ] You've decided whether testers use **your** OpenRouter key (you pay, they have no friction) or **their own** keys (they pay, more setup friction). Most internal-alpha owners pick "their own" — protects your budget from a runaway loop.
- [ ] You've picked **one specific question** you most want answered. Examples: "Does this feel faster than copilot chat for X?", "Is the active-file context enough or do testers immediately ask for workspace search?", "Does the consent modal annoy them?" Write it down. It guides how you interpret feedback.
- [ ] The build artifact is hosted somewhere private (a Drive link, an unlisted GitHub release, a Slack DM upload — not a public release).

---

## 2. Known limitations to include with the build

Send this to each tester verbatim. It calibrates expectations and tells them what to ignore.

> ### CodeSphere AI — Internal Alpha Build
>
> This is an *early* build. The AI chat works end-to-end but several surfaces are not done. **Please ignore the items below in your feedback** — we know about them, they're scheduled, and feedback on them won't tell us anything new. What we *do* want feedback on is in §3.
>
> **Known not-done:**
>
> - **Markdown and code blocks render as plain text.** Responses with `**bold**` or triple-backtick code blocks will look raw. Real markdown rendering is a one-week ticket scheduled for the next sprint.
> - **Reloading the IDE clears the chat history.** Conversation state lives in the webview only; persistence across restarts is not yet implemented.
> - **Several icons in the chat header don't do anything.** The History and Settings icons are placeholders. The "+" in the Context Manager is decorative.
> - **You can't remove an item from the Context Manager.** The X button on context items is local-only — the file will re-appear when you switch back to it. The model only ever sees the currently active file.
> - **No way to start a new chat without reloading the IDE.** Workaround: close and reopen the sidebar.
> - **Error states render as if they were assistant messages.** If something fails ("OpenRouter request failed: ..."), it'll look like the AI just said that.
> - **Model selection is in `settings.json`.** The default is `openai/gpt-oss-120b`. To change: open Settings, search for `codesphere.ai.openRouterModel`, set to any OpenRouter model id.
> - **No right-click "Explain this" / "Fix this" yet.** All interaction is through the chat sidebar.

---

## 3. What we want feedback on

Frame this list when you send. It directs attention away from the gaps above and toward the things that aren't decided yet.

> **The questions:**
>
> 1. **Did the AI actually help you finish something?** Concrete example, not vibes. "I was stuck on X, I asked, it told me Y, it worked / didn't work."
> 2. **How was the first 90 seconds?** From clicking the sidebar to getting your first useful response. Was anything confusing? Where did you get stuck?
> 3. **How often did you want the AI to know about files you weren't currently looking at?** This is the workspace-indexing question — answer steers the next sprint toward a daemon vs. polishing chat.
> 4. **Did the privacy/consent flow feel reasonable or annoying?** One question we genuinely don't know the answer to.
> 5. **What did you reach for that wasn't there?** This is the killer question. Don't suggest features — wait for testers to name them.

---

## 4. Onboarding script for testers

Send testers this exact script. Step-by-step from "I have the build" to "I sent my first message."

> ### CodeSphere AI — Getting Started (5 minutes)
>
> 1. **Install the build.** Download the installer you were sent, run it. CodeSphere should open with a blue Sparkles icon in the left activity bar.
> 2. **Get an OpenRouter API key.**
>    - Visit https://openrouter.ai → sign in → Keys → Create.
>    - Copy the key (starts with `sk-or-`). It looks like a password — treat it like one.
>    - Add $5 to your account (Credits → Add). The default model costs roughly $0.001 per message.
> 3. **Paste your key into CodeSphere.**
>    - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the command palette.
>    - Type `Set OpenRouter API Key`, hit Enter, paste your key, hit Enter.
>    - You'll see a green confirmation.
> 4. **Open the AI sidebar.**
>    - Click the Sparkles icon in the left activity bar.
>    - You'll see two views: AI Chat and Context Manager.
> 5. **Open a code file.** The Context Manager will show its URI — that's what the AI will see.
> 6. **Send a message.**
>    - In AI Chat, type a question about the code in your active editor. *Example: "What does this function do?" or "Are there any bugs here?"*
>    - Hit Enter or click the Send arrow.
>    - **First time only:** A modal pops up asking permission to send your data to OpenRouter. Read it. If you're OK, click "Allow and remember."
>    - The response will stream in token-by-token.
> 7. **Try a follow-up.** Type a question that depends on your first answer. "Explain that more" or "Show me an example." The AI should remember the context.
>
> **If something breaks:** copy the exact text of any error message, note what you were doing, and send to [you, the owner] with the feedback template (§5).

---

## 5. Feedback template

Give each tester this template. Structured fields produce comparable data; an open paragraph produces vibes.

> ### CodeSphere AI Alpha — Feedback (please copy and fill in)
>
> **Your name + date:**
>
> **Hardware / OS:**
>
> **How long did you use it for this session?**
>
> **Q1. What were you trying to do?** (Real coding task, not a test prompt.)
>
> **Q2. Did the AI actually help?** (Yes / partly / no — and why.)
>
> **Q3. What was your first 90 seconds like?** (From clicking the sidebar to getting useful output.)
>
> **Q4. How many times did you wish the AI knew about a file you weren't currently looking at?** (Number — even a rough one.)
>
> **Q5. Did the privacy modal feel reasonable or annoying?**
>
> **Q6. What did you reach for that wasn't there?** (Don't suggest features — describe what you tried to do.)
>
> **Q7. Free-form anything else:**

---

## 6. Invitation template

Copy this into a DM, email, or chat to each tester. Tweak tone to match your voice.

> Hey — I've been building an AI assistant baked into a VS Code fork called CodeSphere, and I'd like 3–5 friendly devs to try it on real code for a week and tell me what they think.
>
> It's early. Markdown doesn't render yet, the IDE forgets your conversation on reload, and a couple of buttons are decorative. I know about all of that — the things I'm trying to learn are about whether the AI actually helps when you're trying to get work done, not whether the polish is there.
>
> If you're in: I'll send you (a) the build, (b) a 5-minute setup guide, and (c) a 7-question feedback form. Time commitment is whatever fits — even 30 minutes of real usage tells me more than my own testing.
>
> No NDAs, no marketing, just a favor I'd really appreciate.

---

## 7. After the alpha — synthesizing feedback

When testers' responses come in:

1. **Tabulate by question.** Open a spreadsheet. One row per tester, one column per Q1–Q7. The pattern matters more than any single response.
2. **Tag each "what wasn't there" mention.** If 3/5 testers wanted workspace search, that's the next sprint. If 3/5 wanted explain-on-selection, the next sprint is different.
3. **Decide on Tier 2 or P2 with that data.** Cross-reference against the §6 questions in [user-stories.md](../design/user-stories.md). The alpha should answer 2–3 of those by itself.
4. **Write a one-page learning summary.** What you knew before, what testers told you, what changed in your roadmap. This is the artifact you'd show a co-founder, investor, or future self.

---

## 8. What this pack does *not* do

- **Doesn't replace the build step.** You still need to run the cross-platform build (or hand the artifacts off to GitHub Actions). On Windows-x64 alone the local build is ~20 minutes after the vscode source is cloned and patched.
- **Doesn't sign or notarize the binary.** Internal alpha can ship unsigned; testers will see Windows SmartScreen / macOS Gatekeeper warnings. Tell them to expect this.
- **Doesn't track usage.** You're not collecting telemetry from testers. All signal comes through the feedback template. That's the right trade-off for T1 — telemetry comes when you have something worth instrumenting.
- **Doesn't establish a tester support channel.** Decide before sending: a Slack room? Email? Open issues on the GitHub repo? Pick one, mention it in the invite.
