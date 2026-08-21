# Milestone 10: Browser Agent Clarification

**Status:** In progress

## Objective

Allow the Browser Execution Agent to pause a bounded task for one concise user
clarification, then resume the same in-memory agent run.

## Agreed Design

- The fixed product-owned agent command `request_user_input(question)` pauses
  the run instead of guessing.
- The main chat presents the question and a response field. Responding resumes
  the existing run with its previous messages, captured actions, and remaining
  budget, after a refreshed browser observation.
- A waiting run remains the only active task. It is not persisted.
- File upload and generic filesystem access are outside this increment.

## Follow-on: Fixed Upload Fixture

The Browser Execution Agent now also has a fixed `upload_test_file` tool. It
accepts no path and always sends the repository-owned `src/fixtures/test.txt`
through Playwright MCP's `browser_file_upload` after the agent triggers a file
chooser. This is execution-only for now; the standardized document has no
upload action yet, so the upload is not exported as CSV or Playwright.

## Follow-on: Dynamic Page Settling

The fixed `wait_for_page_settle` command does not accept a model-selected
duration. TestGen polls the accessibility snapshot while the page reports a
loading state and completes only after a non-loading snapshot is stable across
two polls. A fixed 60-second safety ceiling returns a clear loading-timeout
result rather than letting the agent claim success from an in-progress page.
