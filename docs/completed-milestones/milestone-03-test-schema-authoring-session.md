# Milestone 03: Test Schema and Authoring Session

**Status:** Complete/Historical

## Objective

Establish the smallest browser-independent, in-memory foundation for one
canonical test document and its ordered steps, ready for future Manual
Recording and AI Authoring workflow controllers.

## Outcome

TestGen now has one product-owned, exporter-neutral representation for the
first executable test actions. Future workflow controllers do not need to
invent their own document formats or step queues: they can create canonical
steps and append them to the same mode-neutral session. The foundation remains
data-only; it neither observes nor operates the embedded browser.

## Implementation History

- Added the `src/test-schema/` ownership boundary and its public barrel export.
- Defined `CanonicalTestDocument` with a `neutral` or `preconfigured` starting
  state, optional starting-state notes, and one ordered `steps` collection.
- Defined the flat `CanonicalStep` contract: optional semantic description;
  `navigate`, `click`, and `fill` actions; CSS or XPath selector data;
  optional parameter data; required notes; and explicit provenance source.
- Added construction helpers that create an empty step collection for a new
  document and initialize every new step's `notes` and `source` values to
  empty strings.
- Added structural validation and type guards for documents and steps. The
  validator enforces only the agreed data shape and action-specific fields:
  `navigate` requires a URL parameter, `click` requires a selector and rejects
  a parameter, and `fill` requires both a selector and a value parameter.
- Added `InMemoryAuthoringSession`, which copies its initial document, appends
  supplied canonical steps in order, and returns read-only document snapshots.
  This keeps the initial document inside the session boundary while exposing it
  for read-only consumers.
- Added focused unit coverage for document construction, action rules,
  validation errors, ordered append behavior, the absence of workflow state,
  and session ownership.

## Findings

- The flat canonical-step representation covers the initial `navigate`,
  `click`, and `fill` actions without coupling the schema to a browser runtime
  or export format.
- Structural validity is intentionally separate from document completeness;
  this foundation creates and stores no complete/incomplete status.
- An empty source is meaningful at this layer: it reserves provenance until a
  future workflow supplies `manual`, `planner`, or `direct`, without making an
  unsupported claim about how a step originated.
- The authoring session needs no authoring-mode state. Future workflow
  controllers can share its one document and ordered step collection without
  document transfer or queue migration.

## Project Position at Completion

The project now has both prerequisites for future authoring workflows: the
Milestone 02 product-owned embedded-browser boundary and the Milestone 03
browser-independent test-data boundary. The current application still has no
path that creates steps through the browser or UI, but it has a single, tested
destination for steps once a workflow does so.

Milestone 04 can build direct-step execution against this established action
model and append its `direct` steps to `InMemoryAuthoringSession`. Later Manual
Recording and AI Authoring controllers can use the same session and assign
their own `manual` or `planner` sources. Persistence and exporters can consume
the canonical document later without becoming the schema's source of truth.

This milestone did not connect the schema to Electron, preload, React,
`BrowserSession`, CDP, MCP, Playwright, an AI provider, or an exporter. Those
boundaries therefore remain intact and the implementation introduces no new
runtime dependency.

## Verification Evidence

- `npm run lint` passed.
- `npm run format` passed.
- `npm run typecheck` passed.
- `npm test` passed: 7 Vitest files / 15 tests and 8 Node script tests.
- `npm run build` passed.

## Deferred Work

- Selector discovery, generation, uniqueness validation, and browser
  resolution.
- Browser execution, current/next-step status, recording, AI/planner behavior,
  Human Intervention, and workflow switching.
- Step update, delete, insert, reorder, undo, audit history, and review UI.
- Persistence and Excel, Playwright, or Selenium export.
