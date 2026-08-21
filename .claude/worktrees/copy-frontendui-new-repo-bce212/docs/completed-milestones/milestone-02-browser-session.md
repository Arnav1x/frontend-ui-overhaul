# Milestone 02: Harden the Browser-Session Boundary

## Status

Complete.

## Objective

Replace the Milestone 1 embedded-browser workspace placeholder with one product-owned browser session that has a controlled lifecycle, observable availability state, and an automation target distinguishable from the TestGen host UI.

## Scope

### Included

- One Electron `WebContentsView` created when the TestGen application window opens.
- `about:blank` as the product default target, with `TESTGEN_TARGET_URL` as a development-only launch override.
- A product-owned `BrowserSession` boundary and a Playwright MCP implementation connected through loopback CDP.
- Browser lifecycle states, React-to-main workspace bounds reporting, and browser-status presentation.
- Local MCP Inspector tooling for independently diagnosing a running TestGen browser session.

### Explicitly excluded

- Test schema, authoring-session state, recording, planner or AI behavior, test-step execution, persistence, export, browser-chrome controls, and CRMS-specific behavior.

## Starting Context

The disposable embedded-browser spike had already established that Electron can expose both a host renderer and an embedded `WebContentsView` through loopback CDP, and that Playwright MCP can observe and operate the visible embedded session. It deliberately used a fixed port and MCP Inspector; it did not provide product lifecycle management, target identity, or a product-owned automation boundary.

Milestone 1 had produced the Electron, preload, and React shell. It reserved the browser workspace but did not create a browser session.

## Implemented Design

### Browser-session boundary

[`BrowserSession`](../../src/browser/browser-session.ts) is the product contract. It exposes only lifecycle and status observation in this milestone:

- `starting`
- `ready`
- `navigating`
- `failed`
- `closed`

It intentionally contains no test-step, recording, authoring, or export operation. The concrete [`PlaywrightMcpBrowserSession`](../../src/browser/playwright-mcp-browser-session.ts) implementation owns the local MCP client and does not expose Electron, CDP, MCP, or Playwright tool shapes outside the browser adapter.

### Embedded browser and lifecycle

[`BrowserWorkspace`](../../src/main/browser-workspace.ts) creates one sandboxed, context-isolated `WebContentsView`, adds it to the existing application window, and maps Electron browser events to `BrowserSession` state.

The workspace explicitly loads `about:blank` before interacting with the new view. TestGen then verifies the automation connection while the blank page is present. If `TESTGEN_TARGET_URL` is supplied, TestGen loads it only after this verification. Without that environment variable, the blank page remains the product target.

Main-frame navigation moves the session to `navigating`; a successful page snapshot returns it to `ready`. Load failures, renderer-process loss, MCP failures, and unresolved target selection surface `failed`. Disposing the view/session produces `closed`; this milestone does not add automatic recovery.

### Loopback CDP lifecycle

Before Electron becomes ready, the main process obtains an available loopback port and configures Electron's remote-debugging address as `127.0.0.1`. The endpoint is logged at startup and used by the product adapter.

Electron owns the debugging listener at process scope. TestGen therefore quits when its last browser-owning window closes on every platform, including macOS, so the loopback CDP listener closes with the browser session.

### Target identity

The host renderer and embedded view are separate CDP targets. TestGen records the Electron CDP target ID for diagnostics, but does not select the automation target by URL or target-ID ordering.

Instead, while the embedded page is still the initial blank document, TestGen writes a per-launch marker into that document's title. The Playwright MCP adapter lists tabs, selects the entry containing that marker, and obtains a snapshot. This proves that the selected Playwright page is the product-created view rather than the host UI. The selected Playwright page remains the adapter target through navigation and reload within the live MCP connection.

If selection cannot be established, the session fails rather than guessing based on URL or attempting recovery.

### Renderer bridge and presentation

The preload bridge exposes only:

- current browser-session status;
- browser-session status-change subscription; and
- a React-to-main workspace-bounds report.

The React shell measures the native browser workspace with `ResizeObserver` and reports its rectangle to the main process. The main process validates finite, non-negative coordinates before applying them to the `WebContentsView`.

The UI presents browser availability separately from the deferred authoring choices and the current/next-step placeholders. A browser being `ready` does not imply that an authoring run has started.

## Implementation Findings and Resolutions

### Electron main process is ESM

**Symptom:** The dev app built successfully but no Electron window appeared. The main process reported `ReferenceError: __dirname is not defined` while creating the window.

**Cause:** The Electron-Vite main bundle runs as an ECMAScript module, where CommonJS `__dirname` is unavailable.

**Resolution:** Derive the main-process directory with `fileURLToPath(import.meta.url)` and `dirname(...)`. Use that directory to locate the CommonJS preload output and production renderer files.

### A new WebContentsView requires an explicit initial load

**Symptom:** The embedded area remained blank and a supplied Selenium development target never loaded. The session stayed at `starting` after the CDP endpoint and target ID were logged.

**Cause:** A newly created `WebContentsView` did not yet have a completed blank document in which `executeJavaScript` could run. The initial title-marker operation therefore never completed.

**Resolution:** Explicitly load `about:blank` before setting the title marker or starting the MCP verification. This preserves `about:blank` as the product default and makes the startup ordering deterministic.

### Playwright MCP must run under Node, not Electron

**Symptom:** The browser view loaded, but the product MCP session immediately failed with `Playwright MCP closed.`

**Cause:** In Electron's main process, `process.execPath` is `electron.exe`. Spawning the Playwright MCP CLI with that executable did not start the expected Node stdio server.

**Resolution:** Start the MCP server through `process.env.npm_node_execpath` when npm supplies it, with `node` as the fallback. This matches the runtime used by the validated spike and Inspector workflow.

### Inspector belongs in the root development toolchain

**Question:** The spike had an Inspector setup, but a product launch now selects a per-launch CDP port. A static Inspector config could not safely target a live product session.

**Resolution:** Add `@modelcontextprotocol/inspector` as a root development-only dependency and provide an Inspector wrapper rather than embedding Inspector in the product. The wrapper requires an explicit endpoint, validates that it is unauthenticated loopback HTTP, writes a temporary configuration, launches Inspector, and removes the temporary directory when Inspector exits.

## MCP Inspector Diagnostic Tooling

[`scripts/testgen-inspector.mjs`](../../scripts/testgen-inspector.mjs) creates the development diagnostic path:

1. A developer launches TestGen and copies the logged `http://127.0.0.1:<port>` endpoint.
2. In a second terminal, the developer sets `TESTGEN_CDP_ENDPOINT` to that exact endpoint.
3. `npm run inspector` writes a temporary MCP configuration and opens Inspector.
4. Inspector starts a second Playwright MCP process attached to the same Electron CDP endpoint. It does not share, replace, or control TestGen's product MCP client.

`npm run inspector:tools` provides a non-interactive Inspector CLI tool-list check. The wrapper's Node tests run with the root `npm test` command.

Inspector's transitive Ink/React peer-dependency warnings were observed during installation. The Inspector CLI connection test and manual browser inspection both worked despite those warnings. They are not treated as a product failure unless Inspector itself fails to operate.

Inspector can invoke browser actions, so it is limited to trusted local machines and safe non-production pages. It is a diagnostic tool, not a TestGen browser-control feature.

## Verification Record

### Automated checks

The root verification commands passed:

```powershell
npm run lint
npm run format
npm run typecheck
npm test
npm run build
```

`npm test` runs the Vitest suite and the Node tests for the Inspector wrapper. Focused tests cover target-marker tab selection, unresolved target failure, workspace-bounds normalization, browser-state presentation, and Inspector endpoint/config validation.

### Product runtime check

With Selenium's harmless Web Form as the development target:

```powershell
$env:TESTGEN_TARGET_URL = 'https://www.selenium.dev/selenium/web/web-form.html'
npm run dev
```

The runtime log showed the expected lifecycle:

```text
TestGen browser session: starting
TestGen browser CDP endpoint: http://127.0.0.1:<per-launch-port>
TestGen browser session: navigating
TestGen embedded CDP target: <target-id>
TestGen browser session: ready
TestGen browser session: navigating
TestGen browser session: ready
```

This establishes that TestGen created the embedded browser, verified the product adapter against the initial blank target, and then loaded the development target through the same selected session.

### Manual Inspector proof

Against the same live TestGen launch, the root Inspector wrapper and its CLI connection check worked. In Inspector, the developer:

1. called `browser_tabs` with `action: list`;
2. selected the embedded Selenium tab by index; and
3. called `browser_snapshot`.

The snapshot contained **Web form** and excluded the TestGen host UI. This independently confirmed that Inspector, Playwright MCP, and the product adapter all observed the visible embedded browser target rather than the React host renderer.

## Known Limitations

- Electron's remote-debugging listener is unauthenticated. It is deliberately restricted to loopback and intended only for trusted local development.
- Reserving a port before Electron binds it has a small release-then-bind race. A collision surfaces a browser-session failure rather than automatic recovery.
- The target-marker selection is established for the lifetime of one MCP connection. If that connection fails, the session becomes `failed`; reconnect/reselection is intentionally deferred.
- No user-directed address bar, navigation control, or generalized browser recovery exists in this milestone.
- Inspector's endpoint is supplied through a terminal environment variable. TestGen does not read `TESTGEN_TARGET_URL` or `TESTGEN_CDP_ENDPOINT` from `.env` files.

## Deferred Work

- Canonical test schema and shared authoring-session state.
- Direct normalized-step execution.
- Manual recording and human intervention.
- AI planning and AI authoring.
- Persistence, evidence, and export.
- CRMS-specific workflow validation.
- Browser recovery and reconnection behavior after a failed session.

## Key Artifacts

- [`BrowserSession` contract](../../src/browser/browser-session.ts)
- [Playwright MCP adapter](../../src/browser/playwright-mcp-browser-session.ts)
- [Embedded browser workspace](../../src/main/browser-workspace.ts)
- [Main-process composition](../../src/main/index.ts)
- [Preload bridge](../../src/preload/index.ts)
- [React workspace and status UI](../../src/frontend/app.tsx)
- [Inspector wrapper](../../scripts/testgen-inspector.mjs)
- [Inspector wrapper tests](../../scripts/testgen-inspector.test.mjs)
- [Current setup and diagnostic instructions](../../README.md)
- [Original disposable spike](../../spikes/embedded-mcp-connection/README.md)
