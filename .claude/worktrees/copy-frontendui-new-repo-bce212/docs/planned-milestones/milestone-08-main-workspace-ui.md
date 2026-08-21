# Milestone 08: Main Workspace UI

**Status:** Paused

## Objective

Turn the validated product shell into a clear, desktop-oriented authoring
workspace without changing BrowserSession, the Browser Execution Agent,
prompts, IPC contracts, or the standardized-test schema.

The product name shown to users is **AI Assisted Test Automation Accelerator**.
`TestGen` remains the source/repository and internal code name.

## Scope

- Reimagine the left side as a chat-style authoring transcript: user intents,
  assistant progress/results, and captured steps should read as one updating
  conversation rather than a collection of shell panels. The first UI pass may
  render the existing single-run result as a conversation; queued multi-turn
  behavior is deferred to UX work.
- Make the embedded browser the clear primary work area and place the chat
  transcript in a purposeful, responsive companion panel.
- Replace shell-era wording and placeholder status with accurate, concise
  guidance for the current AI Authoring capability.
- Present browser availability, AI-run progress, completion, stopped, and
  failure states with appropriate visual hierarchy and accessible live status.
- Surface the already-returned, run-local captured test document in a readable
  step list/table, masking entered values by default. This is a display of
  existing result data only: it does not save, edit, execute, or export steps.
- Establish a small, coherent visual language (typography, spacing, status
  colors, cards, and empty states) in the existing Material UI theme.
- Move development-only console launchers out of the primary authoring path,
  while retaining them as useful, clearly labeled debugging consoles for
  development launches.
- Apply the user-facing product name consistently across title, header,
  accessible labels, empty states, and documentation-facing UI copy.
- Add presentation/unit coverage for new UI-state mappings and update the
  README only where user-facing guidance changes.

## Explicitly Out of Scope

- Changes to agent prompts, model/runtime settings, tools, call limits, or
  terminal behavior.
- New preload/main-process APIs, persistence, exporting, recording, document
  editing, execution, queues, or recovery/Human Intervention behavior.
- Changes to BrowserSession, selector capture, test schema, or product-owned
  architectural boundaries.

## Delivery Plan

1. **Information architecture and visual foundation** — define the workspace
   hierarchy, consolidate status treatment, and update the theme/components.
2. **AI authoring workflow surface** — create a focused task composer and
   explicit idle/running/completed/stopped/failed panels using the existing run
   result.
3. **Captured-steps review display** — render current-run action facts,
   selectors, and masked parameters in a legible, read-only review panel;
   clearly state that it is not yet saved or exported.
4. **Polish and verification** — responsive sizing, keyboard/accessibility
   checks, stale-copy cleanup, focused tests, and full repository checks.

## Browser Surface Options

The browser should feel like a browser without pretending that the page itself
is a browser window. Electron documents that `WebContentsView` is not part of
the renderer DOM, and that its bounds must be coordinated between the main and
renderer processes. This makes a separate renderer layer placed directly over
the live page fragile, especially for resizing and input focus.

### Option A — Coordinated browser shell (recommended)

Render a browser frame in the TestGen UI with a compact navigation/address bar,
back, forward, reload, and address/search affordances. Report only the inset content bounds
to the existing `WebContentsView`, leaving the toolbar and page frame in the
renderer. The first pass can make the address field display the current target;
navigation controls require an explicit bridge decision later.

This gives the strongest browser affordance, preserves the current embedded
session, and keeps the native view and UI layer in non-overlapping regions.

### Option B — Fixed 16:9 browser stage

Put the embedded page inside a centered, max-width 16:9 stage with a browser
toolbar above it and letterbox the remaining space. This creates a polished
preview/canvas feel, but it wastes space on common desktop displays and makes
long forms and accessibility inspection less usable. It is better for a demo
mode than the primary authoring surface.

### Option C — Full-height adaptive browser shell

Use the available right-hand area at full height, constrain only the maximum
content width, and add the browser toolbar/frame around it. This is closest to
an everyday browser and handles resizing naturally, while still allowing the
chat panel to take a stable width. It is the recommended layout behavior,
possibly combined with Option A's visual treatment.

### Option D — Native/custom application chrome

Use Electron title-bar/window-overlay APIs to make the entire application look
like a browser window. This changes desktop window behavior and is unnecessary
for the product goal; it should not be part of the first UI milestone.

## Decision to Carry Into Implementation

Implement a chat-style left panel plus Option A's coordinated shell using
Option C's adaptive sizing. Do not force a 16:9 ratio on the live browser.
Treat the address bar as visual/read-only in the UI milestone unless a later
UX decision explicitly adds navigation behavior through the product bridge.

Developer consoles remain available from a developer-tools menu or secondary
header action. They continue to expose their existing raw traces and fixed
diagnostic controls; this milestone changes their placement and framing, not
their diagnostic capabilities.

## Left-Panel Decisions Still Required

The browser shell direction is selected. Before implementation, decide the
following authoring-panel behavior:

- **Conversation versus step timeline:** whether captured actions appear as
  assistant messages, as a dedicated structured step timeline, or as a hybrid
  where messages summarize work and an expandable step card holds details.
- **Run cadence:** whether the first UI supports one submitted task at a time
  (matching the current bridge) or visually previews a queued conversation
  even though execution remains single-run.
- **History lifetime:** whether the transcript is current-run-only and cleared
  on reload, or whether the renderer keeps a local in-session history. No
  durable persistence is assumed for M08.
- **Composer behavior:** single-line prompt, multiline composer, or a compact
  composer with example prompts and a clear disabled/running state.
- **Review emphasis:** whether the panel prioritizes the assistant's plain-text
  report, the captured structured steps, or both with a collapsed/expanded
  hierarchy.
- **Manual interaction affordance:** whether the UI should reserve a visible
  future “Take over / record manually” affordance, or wait until the Manual
  Recording/Human Intervention UX is designed.

## Agreed Left-Panel Direction: AI Authoring Chat

Replace the M01 shell panels (Browser session, authoring-mode cards, and
authoring status) with one dedicated AI Authoring chat interface. Its only
current product action is submitting a plain-language browser task to the
existing single-run AI Authoring bridge.

### Structure

1. **Chat header** — “AI Authoring” title, a concise statement that one task
   runs at a time, and a compact browser-ready/attention status indicator. This
   replaces the separate Browser session panel; it does not duplicate browser
   diagnostics.
2. **Scrollable transcript** — assistant and user messages in chronological
   order. It remains empty until a submitted task becomes a user message.
3. **Run message** — immediately after submission, show an assistant working
   message. When the existing bridge returns, replace it with a completed,
   stopped, rejected, or failed result card. A completed result prioritizes the
   plain-language report and summarizes action count/call usage; captured steps
   are available in a compact expandable read-only section with sensitive
   parameters masked.
4. **Anchored composer** — multiline “Describe the browser task” input and
   Send action at the bottom of the panel. Enter submits; Shift+Enter inserts a
   newline. It is disabled while the one active run is in progress and shows
   that state clearly.

### Deliberate Omissions

- Do not retain a mode picker: Manual Recording is not implemented, and AI
  Authoring is the only available user workflow.
- Do not display a fake multi-turn queue. The transcript may retain local,
  renderer-only messages during the open window, but the bridge still allows
  only one active task at a time.
- Do not claim live action-by-action progress. The current route returns a
  terminal result, so the first chat UI can show “working” followed by the
  result. Streaming observations, step-progress events, clarification, retry,
  and Human Intervention are later UX/product-contract work.
- Do not place manual-control affordances in the UI yet. Add them only with the
  Manual Recording/Human Intervention design and implementation.

## Acceptance Criteria

- A first-time user can identify the browser, the currently available AI task,
  its run state, and its latest result without reading developer diagnostics.
- The visible product name is “AI Assisted Test Automation Accelerator”; no
  user-facing primary heading says “TestGen”.
- The authoring area reads as an updating conversation, with the current user
  intent and assistant/run result visually connected.
- The main workspace accurately states that successful click/fill selector
  capture is attempted and shows captured facts when available.
- Sensitive entered values remain masked in the main workspace by default.
- Development controls remain available only in development and no longer
  compete with the primary authoring action.
- The live browser has a recognizable browser shell and adaptive content area;
  no forced 16:9 letterboxing is required.
- The implementation is renderer/theme/presentation-only and preserves the
  existing bridge and backend contracts.
- `npm run format`, `npm run typecheck`, `npm test`, `npm run lint`, and
  `npm run build` pass.

## Implementation Progress

- Replaced the M01 left-side shell panels with the AI Authoring chat: a local
  in-window transcript, immediate working state, terminal result cards, and a
  bottom-anchored task composer.
- Preserved the existing one-task bridge and made its limitation visible in the
  UI. The transcript is renderer-local and does not imply queuing or
  persistence.
- Completed results now expose a compact, masked, read-only captured-step
  review in the main workspace.
- Added the coordinated adaptive browser shell and removed the legacy tall
  browser-workspace canvas so the browser itself is the right-side surface.

## Pause State

UI implementation is paused after the main-workspace redesign. The current
application presents a responsive AI Authoring chat beside an adaptive browser
surface, and it retains the existing AI-task route and development diagnostic
consoles without changing product contracts.

Remaining M08 work is intentional polish rather than a functional blocker:

- Relocate or group development-console launchers so they are less prominent
  in the primary header.
- Review the workspace manually at default, maximized, and narrow dimensions,
  then address any visual or accessibility refinements discovered there.
- Add focused UI-state coverage when practical in the current renderer-test
  setup.
- Re-run full test/build verification after the local Windows esbuild
  `spawn EPERM` environment issue is resolved.

The next product work is not implied by this pause. Agent prompting, streaming
progress, clarification, recovery, Human Intervention, persistence, recording,
and export remain separate future UX/product-contract decisions.

## Follow-on UX Direction

After this milestone is validated, define a separate UX milestone for the
interaction policy that cannot be solved by presentation alone: intent
clarification, task decomposition, in-run progress/evidence, failure recovery,
and user-directed Human Intervention. That work may change prompts and product
contracts, so it requires an explicit design decision before implementation.
