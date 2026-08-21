# Frontend UI Overhaul (Overhaul v4) — implementation record

**Commit:** `e8cd4e8` on `frontend-ui-overhaul-587e9a` · **Date:** 2026-08-21

**Design source:** the Claude Design project file `Overhaul - v4.dc.html` — annotated
mockups, not code to copy. Its *Implementation notes* section defined the contract:
intentional removals, one top-bar pattern everywhere, a screen → source map
(Phases 0–4 rework `src/frontend/app.tsx`; Phase 5 absorbs
`src/frontend/live-test-progress.tsx`), and an explicit out-of-scope list.

---

## The rules that shaped the change

- **Removals are intentional, not omissions.** The separate Live Test Progress
  window is deleted; the browser back/forward/reload/address chrome (dysfunctional
  placeholders) is dropped; the chat-panel "Log in" button is replaced by the
  Setup tab's Run setup flow.
- **One top bar everywhere.** Wordmark → editable session title → a single
  lifecycle chip; the right side is fixed (Stop while running · Restart ·
  Export ▾ · ⓘ legacy consoles). No breadcrumbs, no site-specific naming in the
  chrome.
- **No budget-pressure UI.** The call limit becomes a 1000-call runaway backstop;
  no counters or `/limit` denominators anywhere. ■ Stop is the practical brake.
- **Out of scope, not built:** assertion generation, persistence across restarts,
  a URL bar in the toolbar, authorable/editable preconfigs, multiple
  environments or accounts.

---

## What changed

### Top bar and lifecycle (all screens)

One header row replaces the old AppBar + footer: the wordmark
**AI Assisted Test Automation Accelerator**, an inline-editable session title
(defaults to *Untitled test*; it becomes the exported spec's `test('…')` name),
and one lifecycle chip driven by `session-lifecycle.ts`:
`draft → ✓ setup complete → ● task running → ⏸ waiting on you → ✓ task complete / ■ stopped / ✕ task failed`.
Right side: **■ Stop** (only while a task runs), **↺ Restart** (clears the
session), **Export ▾** (spec.ts + CSV downloads), and **ⓘ** — a small menu hiding
the legacy Direct Step Console and Agent Testing Console (dev builds only). The
old top-bar console buttons, the browser-status chip, and the status footer are gone.

### Phase 0 — browser session status lives in the pane

While the browser is **starting**, the pane itself shows an amber dot with
"Starting browser… / connecting to the Playwright bridge"; on **failure** it shows
`✕ browser failed`, the failure detail, and an **↺ Restart browser** button right
there. A healthy browser shows nothing. The composer hint mirrors the state and
chat stays locked until the browser is ready.

Two mechanisms enable this:

- The embedded browser is a native `WebContentsView` that floats above the DOM,
  so the renderer now reports **off-screen bounds** (same size, shifted x) whenever
  the pane should show DOM instead — not-ready states and the expanded document
  view. Same size means the embedded page never reflows mid-run.
- A new `application:restart-browser` IPC disposes and recreates the
  `BrowserWorkspace` without touching the session — the document survives a
  bridge restart.

### Phase 1 — Setup tab

The right rail gained **Chat | Setup** tabs (Setup active on launch). The Setup tab:

- **Open a URL** — a plain address box + **Go**. A new `application:open-url` IPC
  normalizes the input (bare hosts get `https://`), navigates deterministically
  through the existing browser-execution command path (no AI call), and appends
  the `page.goto` line to the document as a setup step.
- **Preconfigured setup** — CRMS → environment `std` → account `admin`, static
  single-option lists defined in source (`setup-preconfig.ts`), not authorable.
- **▶ Run setup** — wraps the existing `loginToNcrmsStd` one-click login; its
  deterministic lines (goto, fill user, fill password, click login) enter the
  document as setup steps.

### Phase 2 — setup complete

After setup runs: the rail flips to Chat with a centered **"Setup Ran"** receipt,
the Setup tab label gains ✓, the lifecycle chip reads `✓ setup complete`, and the
code panel shows the setup lines prefixed **⚙** and dimmed — the visible boundary
between free deterministic lines and agent lines that cost AI calls. The composer
invites the first task: *"first agent task — AI calls start here."*

### Phase 3 — the agent's loop, shown in full while it runs

The agent runner now **streams every trace event as it is recorded**
(`onTraceEvent` → `ai-authoring:trace-event` IPC → the chat rail), instead of
returning the trace only with the final result. `run-trace-presentation.ts` folds
the stream into display rows:

- one row per loop turn — `observe` (neutral, with element count), `navigate`
  (blue), `click` (green), `fill` (amber), plus wait/upload;
- an action row stays **pending** (amber dot) until its selector capture and
  browser result land; failures turn the row red;
- every settled row expands (▸/▾) to the raw payload: accessibility-snapshot
  lines with their `ref` tokens, the captured selector and strategy, the browser
  result;
- values typed into credential-like fields are masked (`entered ••••`) as soon as
  the captured selector reveals them.

The code strip under the browser mirrors progress honestly: the live step count
("7 steps · appending"), the last confirmed lines, and the in-flight line
highlighted amber with `● running`. The composer locks ("one task at a time —
stop it to send another").

**■ Stop** is now real: `requestStop()` on the runner is checked at loop
boundaries (a new `user_requested` stopped reason flows through the result
union), exposed via `AiAuthoringController.stop()` and an `ai-authoring:stop`
IPC. With the call limit raised to a 1000-call backstop, Stop is the practical
brake the design calls for.

### Phases 3.1 / 3.2 — terminal summaries

On completion the run collapses into one bubble: a **Completed** tag and a
plain-language sentence, then one row per durable step written to the spec (same
tool tags and colors as the live trace, credentials masked), then the receipt —
*"N steps written to `live-test-progress.spec.ts`"* with **✓ saved**. A grey
*Provide next steps* hint follows and the composer unlocks.

Stopped runs name their reason in the tag (*finished without action · multiple
tool calls · call limit reached · stopped by you*) with a per-reason explanation;
steps confirmed before the stop stay in the spec and the composer invites a
narrower follow-up. Failed runs get the red bubble; if the bridge died, the pane
flips to the Phase 0 failed state and chat stays locked until restart. The old
"N calls" chips are gone everywhere.

### Phase 4 — clarification

A question pauses the run in place: amber **question** bubble (with a "N browser
actions confirmed" line above it), toolbar chip `⏸ waiting on you` plus *"no
calls while waiting"*, and the composer becomes an answer box with a full-width
**Continue** — resuming the *same* in-memory run with a refreshed observation.
One clarification per run; no new task can start until it's answered.

### Phase 5 — review & export, inline

The code strip expands **in place** into the document view (no separate window):

- **Spec is primary.** The document renders as `live-test-progress.spec.ts` with
  the setup lines marked ⚙, selector and parameter fields inline-editable
  (password-like values render masked but export as-is), and any step missing a
  URL/selector/value shown as the same explicit `throw new Error(…)` line the
  exporter writes — mirrored by `spec-presentation.ts` so the view and the export
  can't drift.
- **CSV is demoted, not removed.** The small `spec ⇄ csv` toggle keeps the
  existing editable seven-column table one click away; the CSV download sits
  next to the spec download as the secondary action.
- **Run it early.** The old window's Run Playwright is now inline: Headed/Headless
  toggle, **▶ Run what you have**, framed on-screen as an early check in a
  separate Chromium that never touches the agent's session, with the PASS/FAIL
  banner and raw output below.
- **+ Add step**, an `in-session · not saved` chip, and the no-persistence note
  state the limits explicitly.

### Theme

`app-theme.ts` now carries the design kit: indigo `#3f4cc0` primary, ink
`#1c2330`, the green/amber/red tag palette, 10px radius, Public Sans +
JetBrains Mono (Google Fonts with system fallbacks in `index.html`), shared
`microLabel`/`codeSurface` tokens, and the `StatusTag` pill used for every chip,
tool tag, and receipt.

---

## File map

**Added** — `src/frontend/`: `chat-rail.tsx`, `test-document-panel.tsx`,
`status-tag.tsx`, `setup-preconfig.ts`, `download-file.ts`, and three testable
presentation modules with tests: `session-lifecycle.ts`,
`run-trace-presentation.ts`, `spec-presentation.ts`.

**Deleted** — `src/frontend/live-test-progress.tsx` (absorbed), the
live-test-progress window/IPC/route in `src/main/index.ts`, `window-view.ts`,
`main.tsx`, and the preload bridge.

**Changed** — frontend: `app.tsx` (rewritten), `app-theme.ts`, `index.html`,
`ai-authoring-presentation.ts`, `agent-testing-console.tsx`. Main/shared:
`browser-execution-agent-runner.ts` (trace streaming + stop),
`ai-authoring-controller.ts` (stop), `index.ts` (new handlers),
`ai-authoring-runtime-config.ts` (limit default 12 → 1000),
`browser-execution-agent-run-result.ts` (`user_requested`),
`playwright-exporter.ts` + `playwright-test-controller.ts` (session title →
`test('…')` name, default *Untitled test*). Preload: `application.ts`
(`openUrl`, `restartBrowser`), `ai-authoring.ts` (`stop`, `onTraceEvent`),
`live-test-progress.ts` (test name), `index.d.ts`. Docs: `README.md`,
`Architecture.md`, `milestones.md` updated to the new workspace.

**Verification** — `typecheck`, `lint`, and `prettier` clean; all 114 vitest
tests pass (new coverage for lifecycle/composer states, trace folding, spec
rendering/masking, runner stop + trace streaming, exporter naming; two stale
pre-existing test failures fixed along the way). The app was then launched with
`npm run dev` and driven over its CDP endpoint: launch/draft state, browser
starting → ready, URL Go appending the ⚙ step, document view + CSV toggle,
export menu, and the failure/locked-composer paths. Real agent runs (live trace
→ summary bubble → Stop) were not exercised on this machine — no OpenAI key in
its `.env`.

---

## Implementation journey, in short

1. **Read the design's Implementation notes first**, as instructed — the
   removals, top-bar rule, screen → source map, and out-of-scope list turned the
   mockups into a checklist before any code was read.
2. **Surveyed the existing code** (`app.tsx`, `live-test-progress.tsx`, the
   preload surface, the main-process controllers and agent runner) and mapped
   each design phase to what the backend could already do.
3. **Found four gaps** the design required but the bridge couldn't deliver, and
   closed them with minimal main-process enablers: live trace streaming
   (mirroring the existing `onConfirmedStep` pattern), a cooperative Stop, a
   deterministic open-URL command, and a browser-workspace restart. One
   rendering constraint drove the fifth trick: the embedded browser is a native
   view floating above the DOM, so in-pane status and the inline document view
   only work by parking that view off-screen at full size.
4. **Rebuilt the frontend** as a small composition — app shell, chat rail,
   document panel — with the state-to-copy mapping pushed into three pure,
   tested presentation modules rather than JSX conditionals.
5. **Deleted the old window** end to end (component, route, window creation,
   IPC, bridge), per "removals are intentional".
6. **Updated the living docs and every affected test**, added new ones, and
   fixed two stale failures that predated the work so the suite reads green
   honestly.
7. **Ran the real app** and walked the reachable states over CDP before calling
   it done.

The through-line: the design was treated as a spec with authority — where the
current build couldn't honestly render a state (live trace, a working Stop, an
in-pane browser status), the capability was added rather than faking the UI, and
where the design said *don't build it*, it wasn't built.
