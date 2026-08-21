# Repository Guidelines

## Documentation Routing

Use each document for its specific purpose:

- `Architecture.md` is the source of truth for current durable architectural decisions, constraints, and open questions.
- `milestones.md` is the lightweight delivery index: a concise current-project-status summary, milestone status, objectives, current work, and links to detailed records.
- `docs/planned-milestones/milestone-NN-*.md` contains the detailed scope, agreed design, acceptance criteria, and deferred work for an active or upcoming milestone.
- `docs/completed-milestones/milestone-NN-*.md` contains the implementation history, findings, verification evidence, and final deferred work for a completed milestone.
- `README.md` contains current setup, run, diagnostic, and verification instructions.

Before planning, implementing, diagnosing, or reviewing an active milestone, read `Architecture.md`, `milestones.md`, and its matching planned-milestone record. When reviewing completed work, read the matching completed-milestone record instead. Read detailed records only for milestones affected by the task; do not load every historical record by default.

When documents disagree, follow `Architecture.md` for current design, then update stale milestone or README material as part of the work.

## Documentation Updates

When planning or implementing a milestone changes its agreed scope or durable behavior:

1. Update its planned-milestone record.
2. Update the lightweight entry in `milestones.md`.
3. Update `Architecture.md` only when the current architectural decision or constraint changes.
4. Update `README.md` when setup, commands, diagnostics, or user-facing behavior changes.

When a milestone's completion criteria are met, create its completed-milestone record with the implementation history, findings, verification evidence, and final deferred work. Update `milestones.md` to mark the milestone complete and link to that completion record.

When a milestone changes what the project currently does or does not support,
update the current-project-status summary at the top of `milestones.md`. Keep
it concise, plain-language, and capability-focused; detailed scope, findings,
and verification evidence belong in milestone records.

Do not put trial-and-error narratives, command transcripts, or detailed verification evidence in `Architecture.md` or `milestones.md`.

## Project Structure

Keep code organized by responsibility rather than by screen:

```text
src/
  main/          Electron application process
  preload/       Narrowly scoped frontend bridge
  frontend/      React UI
  browser/       BrowserSession boundary and adapters
  test-schema/   Test document, normalized steps, and validation
  planner/       Future AI/planning boundary
  executor/      Future step-execution coordination
  recording/     Future manual recording
  exporters/     Excel and future exports
```

## Architectural Boundaries

- Keep browser-specific and vendor-specific behavior behind adapters.
- `BrowserSession` is the product-owned browser boundary. Frontend, schema, planner, executor, recorder, and exporters must not depend on Electron, CDP, MCP, or Playwright objects. The development-only Direct Step Console is the narrow exception: it may display M04's fixed, approved Playwright MCP tool names and inputs, but it routes requests through the preload bridge, product controller, BrowserSession, and adapter rather than owning a direct MCP/CDP/Playwright connection or generic tool proxy.
- Keep the canonical test schema independent of planners, browser runtimes, and export formats.
- Do not introduce deferred milestone behavior without an approved architecture decision.
- Use only approved dependencies. Record a dependency decision in `Architecture.md` and its detailed milestone record, then document relevant commands in `README.md`.

The disposable embedded-browser spike remains an independent technical reference. Read `spikes/embedded-mcp-connection/README.md` only when working on the Electron/CDP/Playwright connection itself.

## Coding Style and Naming

Use the configured formatter and linter; do not hand-format around them. Prefer descriptive names such as `resolveStepTarget`, `NormalizedStep`, and `excelExporter`. Use `camelCase` for functions and variables, `PascalCase` for types, classes, and components, and kebab-case for file names where the selected ecosystem supports it.

Represent each test step with explicit fields such as `semanticDescription`, `action`, `selector`, `parameter`, `notes`, and `source` (`planner`, `direct`, or `manual`). Avoid embedding behavior in unstructured prompt text.

## Testing

Test planner output, step normalization, selector resolution, and Excel export independently. Add integration coverage for the shared step queue and embedded-browser executor. Name tests after behavior, such as `executor-stops-on-unresolved-target`.

Run the repository's documented verification commands after changes in proportion to their risk. Keep development-script tests alongside their scripts when they do not need the TypeScript/Vite test runner.

## Commits and Pull Requests

Commits and pull requests are handled by the user.
