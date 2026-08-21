# Browser Test Healer

**Status:** Proposed feature

## Objective

Let an author repair a failed generated Playwright test from inside TestGen.
The healer should diagnose stale or dynamic locators, propose an auditable
structured repair to Live Test Progress, and verify the approved repair in a
separate Playwright run.

This is a TestGen-native feature inspired by Playwright Test's healer workflow.
It does not embed Playwright's agent definition as-is and does not directly
edit a downloaded `.spec.ts` file.

## Problem

CRMS frequently renders dynamic DOM IDs. A captured action such as:

```ts
await page.locator('#typeahead-input-70493').click()
await page.locator('#typeahead-input-70493').fill('adrn-14')
```

can fail in a fresh Playwright browser even though it succeeded in TestGen's
embedded authoring browser. The ID is an implementation detail, not the
element's durable identity.

The meaningful identity may instead be contextual:

```text
Procurement card
  -> searchbox named "Enter protocol number"
```

The exported test should be able to generate a stable Playwright locator such
as:

```ts
const procurement = page
  .locator('.card')
  .filter({
    has: page.locator('.card-header').filter({ hasText: /^Procurement$/ })
  })
const protocolSearch = procurement.getByRole('searchbox', {
  name: 'Enter protocol number'
})

await protocolSearch.fill('adrn-14')
```

## Product Decisions

- The healer owns a bounded diagnose-propose-verify loop; it is not a generic
  coding agent or file editor.
- A repaired locator is stored as a structured Playwright locator recipe, not
  as arbitrary TypeScript supplied by a model.
- The recipe is retained alongside the CSV-compatible CSS selector. CSV keeps
  its existing selector field; the Playwright exporter prefers a validated
  locator recipe when available.
- A user must review and approve a patch before it changes the in-session
  document. The healer never silently edits rows.
- The dedicated Playwright Test MCP server provides diagnosis capability, but
  TestGen exposes only a fixed product-owned wrapper around selected tools.
- Healing runs in a separate Playwright browser session. It never reuses or
  changes the embedded authoring browser.

## Locator Recipe Contract

The new export-only locator representation must be structured and validated.
The first recipe supports the dynamic-locator case without arbitrary code:

```ts
{
  scope: {
    css: '.card',
    has: {
      css: '.card-header',
      text: 'Procurement',
      textMatch: 'exact'
    }
  },
  target: {
    role: 'searchbox',
    name: 'Enter protocol number'
  },
  bindingName: 'protocolSearch'
}
```

The exporter, not the model, turns that recipe into Playwright code. It may
reuse one generated binding for consecutive actions with the same recipe. A
recipe is accepted only when the healing browser can resolve it uniquely to the
expected current element.

Initial recipe support is limited to:

- optional CSS scope;
- optional scoped descendant check using CSS plus exact visible text;
- target by accessible role and accessible name;
- a generated safe binding name.

XPath, arbitrary `evaluate` code, arbitrary regular expressions, and arbitrary
Playwright expression strings remain out of scope until separately designed.

## Available Healer Context

Before its first tool call, the healer receives TestGen-owned facts only:

- the failed generated Playwright test and failing line/step;
- structured Playwright failure output, call log, and error context;
- the original Live Test Progress row and its prior selector;
- selector-capture strategy, captured Playwright locator, action, parameter,
  and preceding confirmed actions where available;
- the current test document and the row order;
- selected Playwright run mode and bounded run metadata.

This context lets the healer target the failed test fact rather than re-plan the
entire browser task.

## Fixed Healer Tools

The main-process healer controller may request only fixed adapters for:

1. run the current generated test;
2. debug the failed test at its failure point;
3. inspect the failed browser accessibility snapshot;
4. inspect relevant browser console messages and network requests;
5. generate a candidate locator for an equivalent element;
6. verify a candidate locator recipe against the paused/current failure state;
7. re-run the test after an approved patch.

The renderer, schema, exporter, and model do not receive direct MCP, CDP,
Electron, Playwright, shell, or filesystem objects. The controller rejects any
tool name or input outside this contract.

## Healer Output Contract

The model returns a validated structured proposal, not code:

```ts
{
  status: 'proposal' | 'unresolved' | 'application_defect',
  failingStepNo: number,
  patches: [
    {
      field: 'playwrightLocatorRecipe' | 'selector' | 'parameter',
      previousValue: string | LocatorRecipe | undefined,
      nextValue: string | LocatorRecipe,
      reason: string,
      evidence: string,
      confidence: 'low' | 'medium' | 'high'
    }
  ],
  callsUsed: number,
  retriesUsed: number
}
```

The controller accepts only patches for the failed row, except that it may
include immediately adjacent actions that refer to the same verified target.
Every locator recipe and optional fallback CSS selector is independently
validated before presentation.

## User Experience

1. A Playwright run fails and keeps its existing output visible.
2. Live Test Progress shows **Heal Test** beside the failed run result.
3. While healing, the UI shows a bounded diagnostic state and disables a second
   healer request.
4. The proposal view shows each affected row, old value, proposed value,
   reason, evidence, and confidence.
5. The author selects **Apply and re-run** or **Reject**.
6. Applying changes updates only the in-session document, regenerates the
   script, and runs it once in the selected headed/headless mode.
7. The UI reports passing, still failing, unresolved, or likely application
   defect. It never claims a repair succeeded without the verification run.

## Implementation Plan

### Phase 1: Export and locator-recipe foundation

- Extend the Live Test Progress export model to retain the existing captured
  `playwrightLocator` and add an optional structured locator recipe.
- Add schema validation, copy/replace support, and row-level patch validation.
- Update the Playwright exporter to prefer validated recipes, generate safe
  reusable bindings, and fall back to validated CSS selectors.
- Add fixture tests for the Procurement-card/searchbox repair and for unsafe or
  ambiguous recipe rejection.

**Exit criteria:** the document can represent and export the stable Procurement
locator without using the dynamic `#typeahead-input-*` ID.

### Phase 2: Failed-run evidence and Playwright Test MCP adapter

- Preserve structured local Playwright run artifacts needed for diagnosis:
  failing test, step/line, call log, error context, selected run mode, and
  generated script identity.
- Add a product-owned adapter for the selected Playwright Test MCP operations.
- Keep the adapter in the main process and validate every fixed operation and
  argument.
- Add focused adapter tests using mocked MCP responses and no generic tool
  proxy.

**Exit criteria:** a failed run can produce a bounded, browser-independent
healing evidence object without exposing runtime objects to the renderer.

### Phase 3: Bounded TestGen healer controller

- Implement a dedicated OpenAI/LangChain healer prompt and controller using the
  fixed evidence and tool contract.
- Enforce one active healing run, one tool call per model turn, a fixed
  combined model/tool-call budget, and a maximum of one diagnostic retry before
  a proposal.
- Parse only the structured proposal contract; reject malformed, unsafe,
  cross-row, or unverified changes.
- Classify likely application defects and unresolved failures rather than
  fabricating a passing patch.

**Exit criteria:** the controller returns a safe locator-recipe proposal for a
dynamic-selector fixture or an evidence-backed unresolved result.

### Phase 4: Review, approval, and verification UI

- Add **Heal Test** only after a failed local Playwright run.
- Show proposed row-level changes, reasons, evidence, confidence, and
  call/retry use.
- Require explicit **Apply and re-run** approval before document mutation.
- Re-run the regenerated script in the user's selected headed/headless mode
  and retain both original and verification results in the open session.

**Exit criteria:** an author can accept a proposed Procurement searchbox repair
and see an independently verified Playwright result.

### Phase 5: End-to-end verification and guardrails

- Add unit coverage for recipe export, fixed-tool routing, evidence parsing,
  patch validation, retry/call limits, user rejection, and application-defect
  classification.
- Add integration coverage for a dynamic selector that heals to a scoped role
  locator and for a repair that remains unresolved.
- Manually validate the CRMS non-production flow, including a headed run.
- Update README, Architecture, feature document, and the Browser Agent Vision
  with final behavior and verification evidence.

**Exit criteria:** the feature reliably repairs the defined dynamic-locator
case without hidden document mutation or generic MCP/file access.

## Guardrails and Non-Goals

- No fully automatic or unreviewed document edits.
- No healing of downloaded files outside TestGen.
- No arbitrary TypeScript, arbitrary locator expressions, arbitrary shell
  commands, generic file editing, or generic MCP access.
- No persistence, CI integration, parallel healer runs, screenshots/vision
  fallback, broad test-data generation, assertions, or manual recording in the
  first implementation.
- A timeout may indicate stale test state, unavailable test data, or an
  application defect. The healer must not weaken a test simply to make it pass.

## Acceptance Criteria

- A failed local Playwright run exposes a clear Heal Test action and preserves
  its original failure output.
- The healer uses known row/test/failure context before calling external tools.
- A dynamic selector such as `#typeahead-input-70493` can be repaired to a
  validated scoped role/name locator recipe.
- The exporter generates safe reusable bindings and uses the repaired locator
  for consecutive actions on the same target.
- The author can inspect, accept, or reject every proposed patch.
- Accepted patches affect only the in-session document and are verified by a
  fresh separate Playwright run.
- The healer stops at its configured budget/retry limits and returns concise
  evidence for unresolved failures or likely application defects.

## References

- [Playwright Test Agents](https://playwright.dev/docs/test-agents)
- [Playwright Test Healer definition](https://github.com/microsoft/playwright/blob/main/packages/playwright/src/agents/playwright-test-healer.agent.md)
