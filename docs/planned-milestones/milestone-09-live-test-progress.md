# Milestone 09: Live Test Progress and Initial CSV Export

**Status:** In progress

## Objective

Let authors see a shared, editable test document form as confirmed browser
actions occur, then download the current document as an Excel-compatible CSV.

## Agreed Design

- The user-facing name is **Live Test Progress**.
- Confirmed actions append to one run-local document across submitted AI tasks.
  The Browser Execution Agent still starts each task fresh; cross-task agent
  context is explicitly deferred.
- Every displayed CSV field is editable, including `StepNo`. This is a
  lightweight execution aid, so editing does not impose uniqueness or other
  authoring validation before CSV download.
- Progress appears only after a browser action succeeds and TestGen has
  captured its intermediary facts. Failed or requested actions are not rows.
- The main window opens an optional Live Test Progress child window. Both
  windows consume the same in-session document.
- The main workspace offers **Restart Session**. It clears the local AI
  Authoring transcript, unsent prompt, login result, and shared in-session
  document, including the optional Live Test Progress window. It leaves the
  embedded browser unchanged and is unavailable while an AI task is running or
  awaiting clarification. Live Test Progress itself is review, editing, and
  download only.
- CSV can be downloaded during a running task and contains all currently
  confirmed rows. It includes real entered parameter values; masking is a UI
  choice and not an export restriction.
- The Playwright preview offers **Run Playwright** next to its download action.
  It runs the current rows through one separate Chromium Playwright Test
  process, displays the pass/fail output, and leaves the embedded authoring
  browser and in-session document unchanged. The author can choose headless
  execution or headed execution in one separate visible Chromium window.
- The CSV header is exactly `StepNo`, `Description`, `Action`, `Selector`,
  `Parameter`, `Additional Parameter`, and `Comments`. TestGen's internal
  `fill` action is exported as `fillintext`; `click` and `navigate` retain
  their names.

## Scope

- Progress events, an in-session editable document, and an optional display
  and editing window.
- RFC 4180-compatible CSV serialization and download.
- Playwright TypeScript serialization, download, and local execution using the
  approved `@playwright/test` development dependency. It maps `navigate`,
  `click`, and `fillintext` to `page.goto`, `page.locator(...).click`, and
  `page.locator(...).fill`; missing required values become explicit thrown
  errors in the generated script.
- Focused tests for confirmed-step capture, editing, and CSV output.

## Deferred

- Native `.xlsx`, persistence, manual recording, document execution,
  assertions, semantic descriptions, and cross-task agent context.
