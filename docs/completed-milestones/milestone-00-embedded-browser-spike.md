# Milestone 00: Embedded Browser Connection Spike

## Status

Complete.

## Objective

Validate that Electron can host a visible embedded browser session and that Playwright MCP can attach to that same session through loopback CDP.

## Scope

This was a disposable technical proof. It deliberately excluded product UI, browser-session lifecycle hardening, test schema, recording, execution, AI integration, persistence, and export.

## Implemented

The spike created one Electron `BrowserWindow` containing two separate renderer targets: a small local host page and a `WebContentsView` loading Selenium's harmless Web Form. Electron exposed CDP only on `127.0.0.1:9222`, while MCP Inspector started a local Playwright MCP process attached to that endpoint.

## Verification

The validation script confirmed distinct CDP page targets for the host page and embedded Selenium page. In Inspector, a developer selected the Selenium page, obtained an accessibility snapshot containing **Web form** and **Text input**, filled the field, and observed the result in the visible Electron view before replacing it manually and observing the manual change through another snapshot.

## Findings

Electron `WebContentsView`, loopback CDP, and Playwright MCP can operate against the same visible browser session. The proof also established that the host UI and embedded page are separate CDP targets, so product automation must deliberately choose the embedded target rather than assuming a single page.

## Limitations

The spike used a fixed CDP port and selected its target manually through Inspector. It did not establish a product lifecycle, a stable product target-selection method, or any canonical test behavior.

## Deferred

Milestone 2 was responsible for product-owned browser-session state, per-launch CDP lifecycle, target selection, React workspace bounds, and product MCP integration.

## Key Artifacts

- [Spike README](../../spikes/embedded-mcp-connection/README.md)
- [Spike Electron host](../../spikes/embedded-mcp-connection/main.cjs)
- [CDP validation script](../../spikes/embedded-mcp-connection/scripts/validate-cdp.cjs)
- [Inspector configuration](../../spikes/embedded-mcp-connection/inspector.mcp.json)
