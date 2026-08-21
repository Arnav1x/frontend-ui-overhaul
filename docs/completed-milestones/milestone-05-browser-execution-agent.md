# Milestone 05: Browser Execution Agent

**Status:** Complete

## Objective

Prove that an OpenAI-backed Browser Execution Agent can execute one human-described
instructed step against TestGen's visible embedded browser through the fixed,
product-owned browser route.

## Outcome

TestGen now accepts one instructed step at a time from the main-window AI
Authoring surface. The Electron main process uses LangChain JavaScript with
OpenAI's Responses API and the configured `gpt-5.6-terra` model to direct the
visible browser through only four TestGen-owned commands: `observe`,
`navigate`, `click`, and `type`.

Before the model's first decision, the runner obtains a current accessibility
snapshot through TestGen's browser route. The model therefore selects actions
from current page state rather than guessing a target. A successful `navigate`,
`click`, or `type` completes the instructed step; `observe` only gathers
information. Failed command results and refreshed observations are returned to
the model so it can choose a subsequent approved action within the provisional
combined 12-call limit.

Every browser operation preserves the product-owned route:

```text
renderer → preload → main-process controller → BrowserSession
         → Playwright MCP adapter
```

The development-only Direct Step Console remains a separate fixed diagnostic
surface. It is not reused as an AI UI or a generic MCP proxy.

## Implementation History

- Added LangChain JavaScript and its OpenAI integration, with main-process-only
  `.env` runtime configuration for the API key, model, and call limit.
- Added a separate semantic browser-command contract and controller for the
  Browser Execution Agent. It maps only the four approved commands through
  `BrowserSession` and its Playwright MCP adapter.
- Added an in-memory LangChain tool-calling runner that owns the call budget,
  feeds browser results back to the model, and terminates after a successful
  action.
- Added the dedicated main-window IPC/preload bridge, one-active-run controller,
  AI Authoring form, and terminal-result presentation.
- Corrected the OpenAI-compatible LangChain tool schema and seeded each run
  with a current accessibility observation after a real tool-call trace showed
  the model had not received browser state.

## Verification Evidence

- `npm run lint` passed.
- `npm run format` passed.
- `npm run typecheck` passed.
- `npm test` passed: 21 Vitest files / 62 tests and 10 Node script tests.
- `npm run build` passed.
- User validation confirmed that individual instructed steps execute quickly
  and efficiently through a multi-step NCRMS workflow.

## Findings

- Accessibility observations must be available to the model before it selects a
  target; prompt instructions alone cannot resolve an unspecified page element.
- The LangChain Responses adapter requires its OpenAI-compatible nested
  function-tool definition for the approved tools to reach the provider.
- The provisional `gpt-5.6-terra` model and 12-call limit were sufficient for
  the completed user validation. They remain editable local settings for future
  evidence-based adjustment.

## Deferred Work

- The planned Selector Capture milestone: product-owned DOM inspection,
  CSS-selector capture, and deterministic standardized-step creation.
- Planner behavior, recording, persistence, export, selector durability,
  queues, retries, recovery, workflow switching, and generic MCP access.
- Screenshot/vision fallback, unless later approved through a separate
  product-owned contract.
