# Embedded MCP Connection Spike

This folder is a disposable technical proof for the browser-connection milestone in `plan.md`. It contains no planner, model/API-key integration, test schema, exporter, or production UI.

It runs one Electron `BrowserWindow` with two distinct renderer targets:

- the small local `host.html` page, which represents the TestGen shell;
- a `WebContentsView` that loads Selenium's harmless [Web form test page](https://www.selenium.dev/selenium/web/web-form.html).

Electron exposes its Chromium DevTools Protocol (CDP) endpoint only on `127.0.0.1:9222`. MCP Inspector starts the locally installed Playwright MCP server over stdio, and that server attaches to Electron over CDP. No model is involved anywhere in this workflow.

## Prerequisites and install

Use Node 22.19 or later (the MCP Inspector requirement). From this directory:

```powershell
npm install
```

If Electron reports `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` or `Electron failed to install correctly`, Node is not using the Windows certificate store (common on networks that inspect TLS). Repair the Electron binary in the current PowerShell session without disabling TLS verification:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npx install-electron --no
Remove-Item Env:NODE_USE_SYSTEM_CA
```

## Run the spike

In one PowerShell window:

```powershell
npm start
```

The Electron window must show the blue TestGen host strip above Selenium's Web form. Type into **Text input** in the visible form to confirm that a human can use the same session.

While it remains open, in another PowerShell window run:

```powershell
npm run validate
npm run inspector
```

`validate` checks that the loopback CDP endpoint reports separate page targets for the host and embedded public page. `inspector` opens MCP Inspector. Its configured server is the local `@playwright/mcp` executable, attached to `http://127.0.0.1:9222`; it never launches a separate browser.

## Manual MCP Inspector proof

Use the Inspector UI only—there is no model or API key in this proof.

1. Connect to `playwright-cdp`, open **Tools**, and invoke the tab/page-listing tool (`browser_tabs` in the current Playwright MCP release). Select the tab whose URL is `https://www.selenium.dev/selenium/web/web-form.html`; do not select the `file:///.../host.html` tab.
2. Invoke `browser_snapshot`. The returned accessibility tree must include **Web form** and **Text input**. It must not include the **TestGen — disposable embedded-browser connection spike** heading from `host.html`.
3. In that snapshot, find the reference for **Text input**. Invoke `browser_fill_form` using that reference and a distinctive value such as `mcp-was-here`. The current tool schema is shown by Inspector; use its generated fields rather than a hard-coded reference.
4. Look at the Electron window. The visible embedded form now contains `mcp-was-here`. Click the field yourself and replace it with `human-was-here`; this is the same visible browser session. Take another `browser_snapshot` to observe the human-entered value.

For a non-interactive connection check, `npm run inspector:tools` invokes MCP Inspector's CLI to list Playwright MCP tools. The visual tool calls above are deliberately left manual because the milestone requires MCP Inspector manual calls.

## Success-criteria verification matrix

| Criterion | Pass evidence |
| --- | --- |
| Electron window contains a live embedded browser | `npm start` shows the `WebContentsView` below the host strip. |
| View loads a harmless public page | The embedded target URL is Selenium's public Web form page; `npm run validate` checks it. |
| Automation can observe it | Inspector's manual `browser_snapshot` returns the embedded page accessibility tree. |
| Automation performs one deterministic action | Inspector manually fills **Text input** with `mcp-was-here`, visible in Electron. |
| Human shares the visible session | The user overwrites that field in the same Electron window and Inspector sees the change. |
| Automation targets the embedded page, not TestGen UI | CDP lists separate host and embedded targets; the selected snapshot has **Web form** and excludes the host heading. |

This repository checkout has validated the package manifest and lockfile, JavaScript syntax, Inspector configuration paths, and the installed Playwright MCP tool names (`browser_tabs`, `browser_snapshot`, and `browser_fill_form`). It has also run the live Electron process and passed `npm run validate`, which confirms the loopback CDP endpoint exposes distinct embedded and host targets. 

## Boundaries and cleanup

The CDP port is fixed at `9222` so `inspector.mcp.json` remains simple. Set `SPIKE_CDP_PORT` only if you also update that config's endpoint. `SPIKE_TEST_PAGE_URL` can override the page for diagnostics, but the validation script expects the same URL.

The remote-debugging endpoint intentionally has no authentication, so use this spike only on a trusted local machine and keep it bound to loopback. Close the Electron window when finished; it closes the local CDP endpoint. The completed manual proof and its go decision are recorded in `Architecture.md`, as reflected in `plan.md`.
