# Milestone 04: Inspector-Like Browser Tool Surface

**Status:** Complete

## Objective

Prove that TestGen can expose a small, Inspector-like, product-routed
Playwright MCP tool surface against its one visible embedded browser, ready for
the future Browser Execution Agent to reuse.

## Outcome

TestGen now provides a development-only Direct Step Console in a separate,
resizable Electron child window. The main development window can open it on
demand, while `npm run dev:tools` opens it automatically beside the normal
browser-owning TestGen window. The console exposes exactly
`browser_snapshot`, `browser_navigate`, `browser_click`, and `browser_type`.

The console displays raw accessibility text and raw latest tool output or
errors. It allows one request at a time and presents browser availability
separately from a tool result. It creates no standardized test document, step,
selector, recording, export, or authoring state.

## Implementation History

- Added browser-owned fixed request/result contracts and strict runtime
  validation for the four approved direct tools.
- Extended `BrowserSession` and its Playwright MCP adapter with serialized,
  one-to-one tool execution and raw MCP text output handling.
- Added a main-process direct-tool controller that rejects malformed,
  non-allowlisted, and disabled-console requests before adapter access.
- Added the narrow preload `directTools` bridge and a dependency-free
  `npm run dev:tools` wrapper.
- Added a dedicated console renderer and development-only child Electron
  window. The main development window can request that child through a narrow
  main-process launcher; packaged applications cannot open it.
- Limited direct-tool IPC to the console window; both the main and console
  windows can read browser status, while only the main window can set embedded
  browser workspace bounds.
- Updated the development workflow to use the CRMS non-production login page.

## Findings

- A tool-level MCP error is actionable console feedback, not necessarily a
  browser-session failure. Transport and connection failures continue to update
  browser availability.
- Snapshot target references are temporary observation data. M04 intentionally
  does not convert them into durable selectors or standardized test steps.
- A separate child console window gives raw snapshot output adequate space
  without introducing a second embedded browser, CDP endpoint, or MCP
  connection.
- The child window requires explicit sender allowlisting so its narrow direct
  tool surface does not become a general renderer-accessible MCP proxy.
- The main-window launcher is separately sender-allowlisted and can only open
  the existing console window; it cannot invoke browser tools.

## Verification Evidence

- `npm run lint` passed.
- `npm run format` passed.
- `npm run typecheck` passed.
- `npm test` passed: 13 Vitest files / 33 tests and 10 Node script tests.
- `npm run build` passed.
- Manual CRMS development walkthrough confirmed that `npm run dev:tools`
  opens the main browser window and separate console window, and that the
  console works against the visible embedded browser.

## Project Position at Completion

M05 can now submit the same fixed browser-tool request union directly to the
main-process controller, without reusing the console renderer or preload
bridge. The console remains available as a development diagnostic alongside
future Browser Execution Agent work.

The standardized test document and authoring session remain separate from
browser interaction. Direct console actions produce no durable test output.

## Deferred Work

- Browser Execution Agent implementation and AI-provider decision.
- Durable selector capture, resolution, freshness handling, and standardized
  test-output creation.
- Planner behavior, manual recording, Human Intervention, review/editing,
  recovery, evidence, persistence, and export.
