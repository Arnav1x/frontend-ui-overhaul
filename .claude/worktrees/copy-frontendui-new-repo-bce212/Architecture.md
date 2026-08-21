# Architecture

This document is the source of truth for TestGen's current architectural decisions, constraints, and open questions. Detailed implementation history and verification evidence belong in `docs/milestones/`.

## Purpose

TestGen helps QA testers, developers, and product managers create structured automated tests for sanitized NIAID CRMS non-production environments. A user may begin with human-readable test information; the product's output is a structured test suitable for downstream export.

## Product Constraints

- Version 1 runs locally from source with repository-documented setup and usage.
- Electron is the application shell; individual subsystem choices remain independently decided.
- The primary application under test is NIAID CRMS in a sanitized, non-production environment.
- Browser-specific and vendor-specific behavior remains behind product-owned adapters.
- The standardized test document/format remains independent of planners, browser runtimes, and export formats.

## Technology Stack

### Language and module system

- **TypeScript** is the product language. It provides explicit contracts between the main process, preload bridge, renderer, and browser-session boundary.
- **ECMAScript modules** are used by the product main process and Node diagnostic scripts. Main-process paths derive from `import.meta.url`, not CommonJS globals such as `__dirname`.

### Local runtime and package management

- **Node.js 24.18.0** is the initial local development runtime. It runs tooling and the local Playwright MCP child process.
- **npm** manages the root dependency lockfile and supplies the documented local commands.

### Desktop application and build system

- **Electron** is the desktop application shell. It owns the product window, sandboxed preload, and embedded `WebContentsView` browser target.
- **electron-vite** integrates Electron's main, preload, and renderer builds for local source development.
- **Vite** serves and builds the React renderer within that Electron development workflow.

### User interface

- **React** renders the TestGen workspace and reports the embedded-browser workspace bounds through the narrow preload bridge.
- **Material UI** and **Material UI Icons** provide the initial desktop-oriented component and icon foundation.
- **Emotion** supplies Material UI's configured styling runtime.

### Code quality and automated verification

- **ESLint** checks JavaScript and TypeScript code quality.
- **Prettier** provides the repository's source and documentation formatting rules.
- **Vitest** runs the TypeScript unit tests.
- **Node's built-in test runner** runs JavaScript tests for development scripts that do not need Vite or Electron.
- **`@playwright/test`** runs the current Live Test Progress export in a
  separate Chromium process. It is a direct development dependency so TestGen
  can execute the generated `.spec.ts` rather than only download it.

### Browser-session implementation

- **Electron `WebContentsView`** hosts the one product-owned embedded browser session.
- **Chromium DevTools Protocol (CDP)** is exposed by Electron only on a per-launch loopback endpoint so local automation can attach to that visible session.
- **`@playwright/mcp`** runs as the local Playwright MCP server attached to the Electron CDP endpoint.
- **`@modelcontextprotocol/client`** is TestGen's local stdio MCP client. The product-owned adapter translates generic MCP calls into `BrowserSession` behavior rather than exposing MCP tool shapes to the rest of the product.

### AI authoring runtime

- **OpenAI** is the approved provider and **LangChain JavaScript** is the
  approved M05, M06, and M07 agent-orchestration runtime. The main-process AI
  Authoring controller owns the LangChain calls and their OpenAI integration as
  part of the product-owned browser-routing path.
- M06 uses gpt-5.6-terra and a provisional limit of 30 combined model and
  browser-tool calls per browser-task run. Both values are editable local
  `.env` settings and will be revisited from NCRMS testing evidence. The
  Electron main process alone loads that file with Node's built-in environment
  file support; the preload and renderer receive none of its values.
- LangChain receives only TestGen-owned, fixed browser tools. It does not use a
  LangChain MCP adapter, remote MCP connection, built-in browser/computer-use
  tool, persisted memory, checkpointer, or workflow controller.
- M06 supplies the Browser Execution Agent with an initial current accessibility
  snapshot. The agent owns one bounded observe-act-refresh loop and may take
  multiple user-visible actions before ending with a plain-text task summary.
  Click and type use a target from the latest observation; TestGen still
  enforces one tool call per model turn and the combined call budget.
- A Planner Agent is deferred. It may be reconsidered only for demonstrated
  cross-user or cross-session coordination; it will not mediate ordinary
  browser actions one at a time.
- The Browser Execution Agent's separate product command contract is `observe`,
  `navigate`, `click`, `type`, `upload_test_file`, and `request_user_input`. The BrowserSession
  adapter alone maps browser commands to the approved local Playwright MCP
  operations; the clarification command pauses the in-memory agent run and
  never exposes browser runtime objects or a generic tool surface. The development
  console's `browser_*` contract is not part of the Browser Execution Agent route.
- `wait_for_page_settle` is a fixed product-owned operation. It polls browser
  state dynamically until a non-loading snapshot is stable, with a 60-second
  safety ceiling; the model cannot choose arbitrary sleep durations.
- `upload_test_file` accepts no model-supplied path. The main process resolves
  the fixed repository fixture `src/fixtures/test.txt` and the browser adapter
  maps it to Playwright MCP's `browser_file_upload`; it is execution-only until
  a standardized upload-step representation is designed.
- Browser Execution Agent targets are snapshot-reference tokens. TestGen
  normalizes an agent-supplied accessibility label containing one `[ref=...]`
  token before selector capture and browser execution, then records both forms
  in the diagnostic trace when normalization occurred; malformed target text is
  rejected before it reaches Playwright MCP.
- The main-window renderer bridge accepts one plain-language browser task and
  permits one active operation. A task may pause for a concise clarification
  response, then resumes with refreshed browser state and the remaining call
  budget. It exposes no queue, persisted history, or recovery state. The Direct
  Step Console cannot invoke this route.
- M06's development-only Agent Testing Console invokes the same bounded Browser
  Execution Agent through a narrow main-process route and reports its terminal
  result. Its product-owned diagnostic trace records browser observations,
  requested fixed-tool inputs, and browser results in chronological order.
  Typed text is masked in the console by default and can be revealed locally
  for diagnosis. A completed M07 run also exposes its run-local intermediary
  test document. The console exposes no generic browser tools or runtime
  objects and does not persist or mutate an authoring-session document.
- The `langchain`, `@langchain/core`, and `@langchain/openai` dependencies are
  approved for M05, M06, and M07. Their exact versions are recorded in the package
  manifest and lockfile.
- The current testing environment permits using sanitized CRMS
  non-production observations and local test credentials with OpenAI. No
  credential-management or production-hardening feature is in M05 scope.

### Development diagnostics

- **`@modelcontextprotocol/inspector`** is a root development-only diagnostic dependency. It starts separately from TestGen and launches its own Playwright MCP process against a supplied live loopback CDP endpoint; it is not part of the product runtime or `BrowserSession` implementation.

Exact dependency versions and local commands are committed in the root package manifest and documented in the root README.

## Runtime Constraints

- The Electron preload remains a CommonJS (`.cjs`) bundle while the product uses Electron sandboxing and context isolation.
- The preload exposes only deliberately narrow `contextBridge` APIs.
- The renderer handles an unavailable preload bridge without crashing.

## Browser-Session Architecture

- TestGen creates and owns exactly one embedded `WebContentsView` in its
  browser-owning main application window. In development, the main window can
  open the Direct Step Console and Agent Testing Console in separate child
  `BrowserWindow`s; `dev:tools` opens the Direct Step Console automatically.
  Both own no browser, CDP endpoint, MCP connection, or browser lifecycle and
  close with the main window. Packaged applications cannot open either console.
- The product default target is `about:blank`. `TESTGEN_TARGET_URL` is a development-only launch override, not a user setting or persisted test data.
- TestGen exposes a per-launch, unauthenticated loopback CDP endpoint and exits when its last browser-owning window closes so that endpoint closes with the browser session.
- `BrowserSession` is the product boundary for browser availability and future browser behavior. Frontend, authoring, recording, execution, planner, schema, and export code do not depend on Electron, CDP, MCP, or Playwright objects. The development-only Direct Step Console is the narrow exception: it may display M04's fixed approved Playwright MCP tool names and inputs, but it routes requests through the preload bridge, product controller, BrowserSession, and adapter rather than owning a direct MCP/CDP/Playwright connection or generic tool proxy. The development-only Agent Testing Console may request only a current observation through the fixed Browser Execution command route; its Planner and Browser Execution Agent calls do not receive browser runtime objects or generic browser-tool access.
- Playwright MCP runs as a local Node stdio process and attaches to the embedded session through CDP.
- The adapter identifies the product-created target with a per-launch marker on its initial blank document, not by its current URL. The selected page remains the target through navigation and reload for the live MCP connection.
- Browser states (`starting`, `ready`, `navigating`, `failed`, and `closed`) describe browser availability only. They remain separate from current and future authoring states.
- MCP Inspector is an independent development diagnostic. It starts a separate Playwright MCP process against an explicitly supplied loopback CDP endpoint and never participates in product runtime behavior.

## Shared Authoring Model

- A mode-neutral authoring session owns one standardized test document and its ordered step collection. The document is a deliberately simple, export-neutral intermediary representation of confirmed test facts; it is not a workflow owner.
- Manual Recording and AI Authoring are separate workflow controllers that use the same authoring-session contract and standardized test schema. The session does not own an active mode, recorder listener, AI/planner state, or mode-switching behavior.
- Manual Recording captures tester-driven browser actions as executable steps without AI participation.
- M06 AI Authoring accepts one human-described browser task from the main
  window and directs browser interaction through product-owned boundaries. The
  Browser Execution Agent owns the bounded loop for that task rather than
  handing each action to a separate planner call.
- A browser task completes only when the Browser Execution Agent returns a
  plain-text terminal summary after at least one successful `navigate`,
  `click`, or `type`. `observe` is information gathering only. TestGen returns
  failed tool results and refreshed observations to the same agent run so it
  can adapt; it provides no queue or recovery subsystem. M06 starts with a
  provisional 30-call combined budget; NCRMS testing will guide revisions.
- M07 captures each confirmed browser action and the Playwright locator emitted
  by local Playwright MCP into an intermediary standardized test document. For
  each `click` and `fill`, the BrowserSession adapter invokes a fixed,
  product-owned DOM evaluation against the exact current snapshot target before
  the action. It returns only a CSS selector that resolves uniquely to that
  same element, preferring stable attributes and labeling a structural fallback
  in the diagnostic trace. The AI directs actions; it does not generate or
  mutate document fields. Selector capture failure leaves the action usable but
  keeps the document selector blank rather than fabricating one.
- Responsibility boundaries are explicit: the Browser Execution Agent completes
  the browser task; TestGen's capture layer records confirmed facts and later
  validated selectors; exporters turn the standardized document into Excel,
  Playwright, or another selected output. No layer treats the document as a
  browser-command log, agent plan, or final export.
- KaneAI is a directional product reference: its publicly documented separation
  of planning, authoring, manual interaction, review, and later maintenance
  supports TestGen's separate workflow-controller and shared-session design.
  It does not determine TestGen's implementation stack or imply knowledge of
  KaneAI's undisclosed internals.
- A future Planner Agent is a possible coordination layer for multi-user or
  cross-session workflows, not a per-click intermediary. User-supplied intent
  provides a specific URL whenever the target is not clear; M06 adds no
  application profiles or target-URL guardrails.
- Switching between authoring workflows is deferred. When introduced, it coordinates workflow controllers around the existing authoring session so the standardized document and ordered steps are retained.
- Every step has an explicit source field. It is initially empty until a future workflow assigns `manual`, `planner`, or `direct`; provenance identifies how the step originated, not its executor or export format.
- Recorder and executor adapters may differ, but both feed the same normalization, validation, ordered collection, and export path.

## Starting State

The product does not assume login or any specific setup action. A test document records either a `neutral` start from TestGen's blank page or a `preconfigured` start prepared by the tester before authoring. Explicit navigation remains a test step. Detailed, reproducible preconditions remain deferred.

## Test Representation and Export Direction

- The product uses a standardized intermediate representation so automated-test exports can support multiple formats without reshaping the codebase around one exporter. It stores confirmed facts needed by exporters, not a richer behavior model than those facts require.
- The first action set is `navigate`, `click`, and `fill`; later actions are added only when a concrete workflow requires them.
- Initial selectors use CSS, with XPath allowed as a future fallback. M07's
  product-owned DOM inspection and selector capture use a fixed evaluation
  against the exact snapshot target. It prefers unique IDs and test attributes,
  then stable `name`/ARIA attributes and host-independent HTTP(S) link routes
  such as `a[href$="/DAIT/SPM/"]`; descriptive `title` attributes and structural
  CSS are lower-confidence fallbacks. A captured selector retains its simple
  source strategy: `id`, `attribute`, `link-route`, or
  `structural-fallback`. Selector generation, validation, and browser
  resolution remain browser-adapter concerns rather than test-schema behavior.
- The first Excel-compatible export is dependency-free RFC 4180 CSV, not an
  `.xlsx` workbook, and is not the source of truth. Its header columns are
  `StepNo`, `Description`, `Action`, `Selector`, `Parameter`, `Additional
  Parameter`, and `Comments`; the exporter maps the internal `fill` action to
  the receiving spreadsheet's `fillintext` terminology.
- The first Playwright export is a TypeScript `.spec.ts` file generated from
  the editable Live Test Progress document. It uses CSS selectors and maps
  `navigate`, `click`, and `fillintext` to `page.goto`,
  `page.locator(...).click`, and `page.locator(...).fill`. It may be downloaded
  or run through a narrow main-process controller in a separate Playwright
  Chromium process; that process never drives or reuses the embedded authoring
  browser. Missing required fields cause an explicit generated error instead
  of a fabricated action; assertions and richer locator use remain deferred.
- Automation presents current-step and next-step status.

## Domain Terminology

### Standardized test document

TestGen's main output is an ordered, in-memory, export-neutral intermediary
representation of confirmed test steps. It contains the facts a future exporter
needs to create its selected format. It is not an executor queue,
browser-command log, execution-result store, agent plan, workflow owner, or
final exported test.

The current minimum per-step facts are:

- `stepNumber`
- `description` (currently permitted to be empty)
- `action`
- `selector`, containing a CSS or XPath selector, its simple source strategy,
  and explicitly blank kind, value, and strategy until capture succeeds
- `playwrightLocator`, retained from confirmed local Playwright MCP output
- `parameter`, when an action needs a value, such as `fill`

The `canonical-*` code names are existing implementation terminology and remain
unchanged for now. The intermediary document is allowed to gain only facts that
a concrete exporter requires.

### Standardized test step

A standardized test step is one ordered set of confirmed export facts in the
standardized test document. `action` plus CSS/XPath `selector` is the core
Excel information; `action` plus `playwrightLocator` is the core information
for a future Playwright exporter. A step may be incomplete while TestGen is
still gathering a required fact, but an exporter must reject or surface that
absence rather than inventing one.

### Authoring session

### Live Test Progress

Live Test Progress is an optional window that displays one editable,
in-session test document shared with the main workspace. A row is appended
only after a browser action succeeds and its intermediary capture facts are
available. It may be downloaded while a task runs; it does not persist the
document, execute edited rows, or treat requested and failed actions as test
facts.

When the Playwright preview is selected, the author can run the current rows
through `@playwright/test`. TestGen writes the generated spec to a unique,
ignored temporary directory under the repository, starts one separate
single-worker Playwright run, displays its bounded output, then removes the
temporary directory. The action does not execute edited rows in the embedded
browser and does not alter the in-session document.

Restart Session is a main-workspace authoring action. It clears the local
authoring transcript and the shared in-session test document while preserving
the embedded browser page. It is unavailable during an active or
clarification-paused Browser Execution Agent task; cancelling an active task
is not currently supported.

### Workflow controller

### Direct Step Console

The Direct Step Console is a development-only controller. A developer uses its
fixed `browser_snapshot`, `browser_navigate`, `browser_click`, and
`browser_type` controls to verify browser functionality through TestGen's
product-owned route. It displays raw snapshot output and is similar in use to
MCP Inspector, but it does not own a direct MCP connection or generic tool
proxy. The console is a precursor and debugging tool for the Browser Execution Agent;
it does not create a standardized test document.

### Browser task

A browser task is one bounded plain-language input to the Browser Execution
Agent. It can contain several user-visible actions. It is not itself a
standardized test step; M07's capture layer records only its confirmed actions
as intermediary test-document facts.

### Browser Execution Agent

The Browser Execution Agent receives one human-described browser task at a
time and directs browser interaction through product-owned boundaries. It owns
the bounded observe-act-refresh loop but does not itself create standardized
test-document fields or own persistent workflow state. TestGen's capture layer
creates the intermediary document from the agent's confirmed action facts.

## Open Questions

- The vision-fallback contract. M04 does not expose screenshots, so any vision
  fallback requires an approved product-owned observation path rather than a
  generic MCP expansion.
- XPath fallback criteria and longer-term selector stability rules beyond the
  current validated CSS attribute, route, and structural candidates.
- What evidence would justify a coordination planner for multi-user or
  cross-session browser tasks.
- Failure handling, Human Intervention behavior, screenshots/evidence, and review controls.
