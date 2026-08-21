# Milestone 01: Product Shell and Mode-Neutral UI

## Status

Complete.

## Objective

Create a separately runnable TestGen desktop application that represents Manual Recording and AI Authoring without implementing browser control, recording, AI behavior, test documents, or export.

## Scope

The milestone established the root Electron, preload, and React structure plus a mode-neutral UI shell. It intentionally did not create a live embedded browser session or introduce an authoring data model.

## Implemented

The application gained an Electron-Vite, React, TypeScript, and Material UI foundation under the product structure defined by `AGENTS.md`. The shell presents distinct Manual Recording and AI Authoring choices, a preconfigured-start indicator, unavailable start controls, current/next-step placeholders, and a reserved embedded-browser workspace.

Frontend mode selection is presentation-only and has a focused Vitest check ensuring that the two authoring modes remain distinct choices. The root README added local setup, run, troubleshooting, and baseline verification instructions.

## Verification

Linting, formatting, and type checking passed during the original milestone audit, and the application shell was launched and visually reviewed. In that agent environment, Vitest and the production build initially could not start because esbuild process spawning returned `spawn EPERM`; this was an environment limitation rather than a source failure, with an npm script-approval recovery path documented in the README.

## Findings

Electron-Vite's preload output must be CommonJS (`.cjs`) for this sandboxed, context-isolated Electron setup. An ESM preload was rejected before `contextBridge` executed, which left the bridge absent and initially caused a blank renderer; emitting and loading the CommonJS preload resolved it.

## Deferred

Milestone 2 introduced the live embedded browser, loopback CDP, product Playwright MCP adapter, browser lifecycle state, and workspace-bounds bridge. Test documents, recording, execution, AI, persistence, and export remained deferred.

## Key Artifacts

- [Electron main process](../../src/main/index.ts)
- [Secure preload bridge](../../src/preload/index.ts)
- [React shell](../../src/frontend/app.tsx)
- [Authoring-mode presentation](../../src/frontend/authoring-mode.ts)
- [Root README](../../README.md)
