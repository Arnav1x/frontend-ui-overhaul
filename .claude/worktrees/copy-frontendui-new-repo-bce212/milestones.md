# Milestones

This document is TestGen's lightweight delivery index. `Architecture.md` records current durable decisions, while completed-milestone evidence and implementation history live in `docs/milestones/`.

## Current Project Status

TestGen has a working local Electron application shell with one visible,
product-owned embedded browser. The browser lifecycle and its local automation
connection are established and independently diagnosable.

TestGen's standardized test document is an in-memory, export-neutral
intermediary for confirmed test facts. Live Test Progress is now being added to
show an editable in-session output and download an initial Excel-compatible
CSV, without becoming an execution queue or agent plan.

What works now:

- The Electron/React shell and embedded browser session run locally.
- Browser availability is tracked behind the `BrowserSession` boundary.
- M03 provides the historical first in-memory `navigate`, `click`, and `fill`
  document/session foundation; M07 completed the current agent-captured
  intermediary output fields.
- Developers can open a separate development-only console window from the main
  window, or launch it automatically with `npm run dev:tools`, to snapshot,
  navigate, click, and type in the visible embedded browser.
- A user can submit one plain-language AI Authoring browser task at a time.
  The Browser Execution Agent owns its bounded observe-act-refresh loop through
  the fixed product-owned route.
- The agent can pause for a concise clarification in the main chat and resume
  that same in-memory run after the user responds.
- Developers can open a separate Agent Testing Console to diagnose that same
  bounded Browser Execution Agent route.
- The main workspace now presents AI Authoring as a local, chat-style task
  transcript beside the embedded browser; it still accepts only one active
  task at a time and does not persist chat or test documents.
- Completed agent-console runs expose an incomplete intermediary document with
  confirmed actions, validated CSS selectors where capture succeeds, and
  captured Playwright locators. Snapshot-label targets supplied by the agent
  are normalized to their reference token before browser execution. Link
  selectors prefer validated host-independent routes over descriptive titles;
  each captured selector records whether its strategy was an ID, attribute,
  link route, or structural fallback.
- Live Test Progress appends confirmed actions across submitted tasks to one
  editable in-session document. The optional window can download the current
  rows as Excel-compatible CSV or a simple Playwright TypeScript spec,
  including real entered values, and can run the current Playwright export in
  a separate Chromium process without affecting the embedded browser.
- **Restart Session** in the main workspace clears the local authoring view and
  shared in-session document while preserving the embedded browser page.

What does not work yet:

- AI execution does not yet create semantic step descriptions or XPath fallback
  selectors.
- Users cannot yet create steps through the UI or browser recording.
- Standardized test steps are not yet executed against the embedded browser.
- Documents are not persisted across app restarts.
- Workflow switching, editing controls, and Human Intervention are not implemented.

M06 is complete: the Browser Execution Agent can complete a bounded multi-action
browser task through the visible browser, with a developer-facing execution
trace. M07 is complete: confirmed actions, Playwright locators, and validated
CSS selectors are captured into the intermediary document. Semantic
descriptions and XPath fallback remain deferred.
A Planner Agent is deferred until a real cross-user or cross-session
coordination need emerges.

## Milestone 09: Live Test Progress and Initial CSV Export

**Status:** In progress

### Objective

Show and edit the shared in-session test document as confirmed actions occur,
then download it as Excel-compatible CSV.

### Detailed Record

[M09 Live Test Progress and Initial CSV Export](docs/planned-milestones/milestone-09-live-test-progress.md)

## Milestone 10: Browser Agent Clarification

**Status:** In progress

### Detailed Record

[M10 Browser Agent Clarification](docs/planned-milestones/milestone-10-agent-clarification.md)

## Future Direction: Browser Agent Vision

**Status:** Planned

This non-numbered planning record consolidates the established Browser
Execution Agent direction, its authoring-session behavior, and future
increments that require separately scoped milestones.

### Detailed Record

[Browser Agent Vision](docs/planned-milestones/browser-agent-vision.md)

## Milestone 08: Main Workspace UI

**Status:** Paused

### Objective

Make the existing main workspace clear and usable for the validated AI
Authoring flow, using only renderer/theme/presentation changes. This milestone
will accurately surface existing run-local captured steps and statuses without
adding persistence, editing, exports, agent changes, or new backend contracts.
The user-facing product name is **AI Assisted Test Automation Accelerator**;
`TestGen` remains the repository and code name. The intended layout is an
updating chat-style authoring panel paired with an adaptive browser shell.
Development-only Direct Step and Agent Testing Consoles remain available as
useful debugging tools, with their current diagnostic capabilities preserved.
The milestone is paused after this main-workspace implementation; remaining
work is UI polish and broader verification, not a functional dependency.

### Detailed Record

[M08 Main Workspace UI](docs/planned-milestones/milestone-08-main-workspace-ui.md)

## Status Terms

- **Complete** — the milestone outcome and completion criteria are met.
- **In progress** — work is currently being refined or implemented.
- **Paused** — work is intentionally stopped with its current implementation
  recorded; resumption requires a new user or project decision.
- **Planned** — the next-direction summary will be refined immediately before implementation.
- **Blocked** — a named decision or dependency must be resolved before work can proceed.

## Milestone 00: Embedded Browser Connection Spike

**Status:** Complete

### Objective

Validate that Electron can host a visible embedded browser session and that Playwright MCP can attach to that same session through loopback CDP.

### Implemented

A disposable Electron host exposed separate CDP targets for its local host UI and Selenium Web Form `WebContentsView`. MCP Inspector observed and operated the visible embedded page through loopback CDP.

### Verification

The spike validation script and manual Inspector workflow confirmed that a human and MCP interacted with the same embedded Selenium session, not the host page.

### Findings

The Electron, `WebContentsView`, loopback CDP, and Playwright MCP direction was feasible. Product lifecycle, target identity, and per-launch port handling were deliberately left for Milestone 2.

### Deferred

Product UI, browser-session hardening, recording, execution, AI, test documents, and export were outside the spike.

### Detailed Record

[Milestone 00 embedded-browser spike](docs/completed-milestones/milestone-00-embedded-browser-spike.md)

## Milestone 01: Product Shell and Mode-Neutral UI

**Status:** Complete

### Objective

Create the separately runnable Electron and React shell that represents Manual Recording and AI Authoring without implementing authoring behavior.

### Implemented

TestGen gained its product main process, sandboxed preload, React shell, explicit authoring-mode choices, and a reserved browser workspace. The shell remains intentionally browser-free and authoring-free at this point in its history.

### Verification

The shell was launched and reviewed, with focused mode-presentation coverage and baseline code-quality checks. The original esbuild `spawn EPERM` environment issue was documented as tooling-environment recovery guidance, not a product failure.

### Findings

The sandboxed preload must remain a CommonJS bundle so Electron can load `contextBridge` before the renderer starts. The renderer also needs an unavailable-bridge state rather than assuming the bridge exists.

### Deferred

The live embedded browser, CDP, product MCP integration, test documents, recording, execution, AI, persistence, and export were deferred to later milestones.

### Detailed Record

[Milestone 01 product shell](docs/completed-milestones/milestone-01-product-shell.md)

## Milestone 02: Harden the Browser-Session Boundary

**Status:** Complete

### Objective

Create one product-owned embedded browser session with observable lifecycle state and a verified automation target.

### Implemented

TestGen now creates one `WebContentsView`, exposes lifecycle state through `BrowserSession`, verifies the embedded target through Playwright MCP over per-launch loopback CDP, and keeps the native view aligned with the React workspace. The root Inspector workflow independently diagnoses the same live browser session without joining the product runtime.

### Verification

The product adapter and root Inspector workflow both listed and snapshotted the visible Selenium development target while excluding the TestGen host UI. Root lint, format, typecheck, tests, and build checks passed.

### Findings

Electron main uses ESM paths, a new view must explicitly load `about:blank`, and Playwright MCP must be spawned with Node rather than Electron. The adapter selects the embedded view with a per-launch blank-page marker rather than its current URL.

### Deferred

Test schema, authoring state, execution, recording, AI, persistence, export, browser controls, generalized recovery, and CRMS workflow behavior remain future work.

### Detailed Record

[Milestone 02 browser-session](docs/completed-milestones/milestone-02-browser-session.md)

## Milestone 03: Test Schema and Shared Authoring Session

**Status:** Complete

### Objective

Define the initial browser-independent, in-memory document/session foundation
used by future Manual Recording and AI Authoring workflows.

### Implemented

TestGen now has the historical first browser-independent document/session
foundation: a flat `navigate`, `click`, and `fill` step model, CSS/XPath
selectors, empty default `notes` and `source` fields, and
neutral/preconfigured starting-state markers. An in-memory, append-only session
owns its ordered collection without authoring-mode, browser, recording,
planner, or switching state. M07 refines the current intermediary output fields;
M03 does not prescribe their final shape.

### Verification

Focused schema/session unit coverage and the root lint, format, typecheck, test, and build checks passed.

### Deferred

Browser event recording, selector discovery and resolution, authoring execution, AI/planner behavior, and switching between authoring workflows remain outside this milestone.

### Detailed Record

[Milestone 03 test schema and authoring session](docs/completed-milestones/milestone-03-test-schema-authoring-session.md)

## Milestone 04: Inspector-Like Browser Tool Surface

**Status:** Complete

### Objective

Prove that TestGen can expose a small, Inspector-like, product-routed
Playwright MCP tool surface against its own embedded browser, ready for the
future Browser Execution Agent to use.

### Implemented

TestGen now provides a development-only child console window, opened from the
main development window or automatically with `npm run dev:tools`, with fixed
`browser_snapshot`, `browser_navigate`, `browser_click`, and `browser_type`
controls. It routes requests through the preload bridge, product controller,
BrowserSession, and adapter against the visible embedded browser. The console
displays raw output and does not create or mutate standardized test documents.

### Detailed Record

[Milestone 04 Inspector-like browser-tool surface](docs/completed-milestones/milestone-04-inspector-like-browser-tool-surface.md)

## Milestone 05: Browser Execution Agent

**Status:** Complete

### Objective

Prove OpenAI can execute one instructed step through the fixed,
product-routed browser-tool surface.

OpenAI is the selected provider. A human supplies one plain-language
instruction; successful execution is defined by an approved browser tool's
successful action result. `observe` is information gathering only; successful
`navigate`, `click`, or `type` completes the instructed step. Failed results
are returned to the agent so it can adapt.
M05 uses LangChain with its OpenAI integration, gpt-5.6-terra, and a
provisional 12-call limit configured locally through .env. NCRMS testing will
determine whether those settings or the terminal failure policy change.
The completed implementation added the approved dependencies and
main-process-only local runtime configuration; a separate fixed AI Authoring
browser-command boundary through BrowserSession; an in-memory LangChain run
with a combined call cap and adaptive tool-result feedback; and the
main-window UI, preload bridge, and main-process controller. The controller
obtains a current browser observation before the provider's first decision;
its Responses request requires an approved tool call, and click/type
instructions use a target from the latest observation.

User validation confirmed that the agent can execute a multi-step NCRMS
workflow efficiently when each action is submitted as an instructed step.

### Detailed Record

[M05 Browser Execution Agent](docs/completed-milestones/milestone-05-browser-execution-agent.md)

## Milestone 06: Bounded Browser Execution Agent

**Status:** Complete

### Objective

Prove that the Browser Execution Agent can complete one user-supplied browser
task in its own bounded observe-act-refresh loop.

### Scope

M06 removed the separate one-action Planner Agent experiment. The Browser
Execution Agent now completes bounded multi-action tasks and the development
console exposes its product-owned execution trace. The agent does not create
standardized test steps.

### Detailed Record

[M06 Bounded Browser Execution Agent](docs/completed-milestones/milestone-06-bounded-browser-execution-agent.md)

## Milestone 07: Test-Document Action Capture

**Status:** Complete

### Objective

Capture confirmed Browser Execution Agent actions into the standardized test
document as export facts: step number, description, action, CSS selector,
Playwright locator, and parameter where needed. This is intermediary output,
not an exporter or execution log.

### Detailed Record

[M07 Test-Document Action Capture](docs/completed-milestones/milestone-07-test-document-action-capture.md)

## Future Milestone: Manual Recording and Human Intervention

**Status:** Planned

### Objective

Capture representative tester actions as executable manual steps and use that same path during paused AI authoring intervention.

### Entry Condition

The shared schema and browser-facing execution path must be available so recorded actions enter the same ordered collection as other steps.

### Deferred

Broader recording coverage and recovery design follow observed workflow needs.
