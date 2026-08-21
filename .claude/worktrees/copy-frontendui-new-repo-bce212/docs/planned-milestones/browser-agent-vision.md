# Browser Agent Vision

**Status:** Planned, non-numbered direction record

## Purpose

This record consolidates the agreed product direction for the Browser
Execution Agent. It is a planning reference rather than a delivery commitment:
future work must still be split into scoped milestones with explicit acceptance
criteria before implementation.

## Product Vision

An author describes a browser-testing task in plain language. TestGen's
Browser Execution Agent operates the one visible, product-owned embedded
browser to complete that bounded task, records only confirmed test facts, and
helps the author review and export an evolving automated-test document.

The agent should feel like a capable authoring partner, not a hidden browser,
generic MCP client, or autonomous background system. The author remains able
to see the browser, understand the task result, inspect captured steps, and
start a clean authoring session when appropriate.

## Current Foundation

- One plain-language browser task runs at a time against the visible embedded
  browser.
- A fresh agent run owns a bounded observe, act, and refreshed-observation
  loop. It may complete multiple visible browser actions before returning a
  plain-text terminal result.
- The fixed product commands are `observe`, `navigate`, `click`, `type`,
  `upload_test_file`, and `request_user_input`. Page settling is a
  product-owned operation; the model cannot request arbitrary sleeps.
- TestGen applies a combined model and browser-command budget, allows one tool
  call per model turn, and exposes no generic browser-tool proxy.
- The agent receives browser facts only through `BrowserSession`; renderer,
  schema, and exporter code do not receive Electron, CDP, MCP, or Playwright
  objects.
- Confirmed `navigate`, `click`, and `fill` actions append to one editable,
  in-session Live Test Progress document. Failed and requested actions are not
  test rows.
- Captured click and fill facts retain a validated CSS selector where available
  and the Playwright locator produced by local Playwright MCP. Missing capture
  data remains explicitly blank rather than fabricated.
- The main workspace provides a chat-style task transcript, while the optional
  Live Test Progress window supports editing and CSV or simple Playwright-spec
  download.
- The development-only Agent Testing Console exposes the same bounded route
  and its diagnostic trace without becoming a second browser owner.

## Authoring-Session Behavior

- **Restart Session** belongs in the main workspace, alongside the console
  controls. It clears the home-page transcript, pending prompt, login result,
  and shared Live Test Progress document.
- Restart Session preserves the embedded browser's current page. Browser
  lifecycle reset is a separate capability, not an implicit side effect of
  beginning a new test-authoring session.
- Restart Session is disabled while the agent is executing or paused for a
  clarification. Cancelling a running task is not supported yet.
- The authoring transcript and document are in memory only. No cross-restart
  persistence, queue, or agent memory is implied.

## Next Product Increments

Future milestones should prioritize demonstrated authoring needs and preserve
the existing product boundaries. Likely increments include:

1. **Clarification and intervention UX** — make questions, answers, task
   status, failures, and a later human-takeover path clear and safe. Define an
   explicit cancellation contract before enabling Restart Session during a
   running task.
2. **Test-fact quality** — add AI-generated semantic descriptions only from
   confirmed actions, refine selector-stability policy, and define XPath
   fallback criteria where CSS capture is insufficient.
3. **Review and export maturity** — improve review controls, validation, and
   exporter coverage without treating the test document as an execution queue.
4. **Manual recording** — capture tester actions through the same normalized
   test-document and selector path, then use it as the basis for Human
   Intervention where appropriate.
5. **Evidence and recovery** — design screenshots or another approved
   observation path, failure evidence, retry policy, and user-directed
   recovery. Do not add vision or generic browser access outside the
   product-owned boundary.
6. **Persistence and collaboration** — consider durable documents or a Planner
   Agent only after a demonstrated cross-session or cross-user coordination
   need. A Planner Agent must not become a per-click intermediary.

## Non-Goals and Constraints

- The standardized test document remains export-neutral confirmed facts, not
  an agent plan, execution log, browser-command queue, or workflow owner.
- Browser-specific and vendor-specific behavior remains behind adapters and
  `BrowserSession`.
- The agent must not receive unrestricted filesystem access, arbitrary file
  paths, direct MCP/CDP/Playwright access, persisted memory, or a generic tool
  surface.
- Browser reset, task cancellation, persistence, manual recording, assertions,
  screenshots, and recovery each require a scoped design decision; none is
  implicitly enabled by this vision.

## Related Records

- [M06: Bounded Browser Execution Agent](../completed-milestones/milestone-06-bounded-browser-execution-agent.md)
- [M07: Test-Document Action Capture](../completed-milestones/milestone-07-test-document-action-capture.md)
- [M09: Live Test Progress and Initial CSV Export](milestone-09-live-test-progress.md)
- [M10: Browser Agent Clarification](milestone-10-agent-clarification.md)
- [Browser Test Healer feature](../features/browser-test-healer.md)
