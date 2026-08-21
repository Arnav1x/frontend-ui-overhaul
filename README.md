# TestGen

TestGen is an internal desktop browser-test authoring tool for NIAID CRMS
non-production environments. It creates one embedded browser when it opens and
offers development-only Direct Step and Agent Testing Consoles. The former
directly inspects and drives the browser through TestGen's product-owned route;
the latter independently exercises the two AI agents. AI Authoring can execute
one plain-language browser task at a time through a separate,
product-owned route.

The embedded browser defaults to `about:blank`. This is intentional: a test
begins with the deterministic opening lines that setup writes. There is no
address bar in the browser chrome; URL entry lives in the **Setup** tab only,
where **Go** deterministically opens the entered page and records the
`page.goto` step.

## The workspace

The main window is one workspace. The top bar shows the app wordmark, the
inline-editable session title (default **Untitled test** — it becomes the
exported spec's `test('…')` name), and a single lifecycle chip
(`draft → ✓ setup complete → ● task running → ⏸ waiting on you →
✓ task complete / ■ stopped / ✕ task failed`). The fixed right side holds
**Stop** (while a task runs), **Restart**, **Export ▾** (spec.ts and CSV
downloads), and — in development launches — a small **ⓘ** legacy menu for the
Direct Step and Agent Testing Consoles.

The left side is the embedded browser above the **live test progress** code
panel; the right rail has **Chat** and **Setup** tabs. Browser session status
(starting / failed) is shown inside the browser pane itself, together with a
**Restart browser** action when the session fails; the composer explains why
chat is locked while the browser is unavailable.

## Live test progress, document view, and downloads

The code panel under the browser previews the captured spec lines as they are
confirmed — setup lines are marked `⚙`, agent lines append after them. Select
**Document view** to expand the panel in place. The Playwright spec view is
primary and every step field is editable inline; the CSV table stays
live-viewable behind the small **spec ⇄ csv** toggle. Credential-like fill
values render masked (`••••`) in views; downloads export the entered values.
The in-session document keeps appending across submitted AI tasks and is
cleared when the application closes; nothing is persisted.

Use **Export ▾** in the top bar (or the buttons in the document view) to
download `live-test-progress.spec.ts` or the Excel-compatible CSV at any time,
including while a task runs. The spec generates `page.goto`, CSS-locator
clicks, and fills; a row missing a required URL, selector, or fill value
becomes an explicit error in the generated script rather than being silently
dropped. Assertions are not generated yet. The CSV keeps the editable columns
`StepNo`, `Description`, `Action`, `Selector`, `Parameter`,
`Additional Parameter`, and `Comments`, and uses `fillintext` for TestGen's
internal `fill` action.

Select **Restart** in the top bar to begin a new in-session authoring
document. It clears the local chat, setup state, session title, and captured
rows, but leaves the embedded browser on its current page. The action is
unavailable while an AI task is active or awaiting a clarification response.

In the document view, choose **Run what you have** to replay the current rows
in a separate Chromium process as an early check — it does not reuse or change
the embedded authoring browser, and it is not the final suite run. Select
**Headed** to show that separate Chromium window or leave **Headless**
selected. Install the Playwright Chromium browser once before the first run:

```powershell
npm run playwright:install
```

## End Vision / Purpose

The purpose and end goal of this project is to make a tool that turns the user's intent / list of steps into an automated test script. The proposed method uses a Browser Execution Agent to explore the website, then exports a standardized test document which can later be exported into the automated test script format of your choosing.

## Prerequisites

- Node.js 24.18.0
- npm (bundled with Node.js)

If Electron cannot download because a network inspects TLS, use the Windows-certificate-store repair described in [the disposable spike README](spikes/embedded-mcp-connection/README.md#prerequisites-and-install). Do not disable TLS verification.

## Install and run

From the repository root in PowerShell:

```powershell
npm install
$env:TESTGEN_TARGET_URL = 'https://ncrmsstd.digitalinfuzion.com/NCRMS/Main/Login.aspx'
npm run dev
```

`npm run dev` opens the TestGen Electron window with an embedded `about:blank`
browser. The **Chat** tab accepts one bounded AI Authoring browser task at a
time and executes it when the OpenAI configuration is present. **Manual
Recording** is still unavailable. In a development launch, the **ⓘ** menu in
the top bar opens the separate Direct Step and Agent Testing Console windows
when needed.

### AI Authoring configuration (M05)

Copy `.env.example` to the repository-root `.env` file and set the OpenAI key:

```powershell
Copy-Item .env.example .env
```

`OPENAI_API_KEY` is required when an AI Authoring browser task starts.
`TESTGEN_AI_AUTHORING_MODEL` and `TESTGEN_AI_AUTHORING_CALL_LIMIT` default to
`gpt-5.6-terra` and `1000` if omitted. The call limit is a runaway backstop
only — no counter appears in the UI, and the top-bar **Stop** button is the
practical brake on an active task. TestGen loads `.env` in the Electron main
process only; these values are not exposed through the preload bridge or
renderer. `.env` is ignored by Git, while `.env.example` is safe to commit.

To execute a browser task, prepare the page from the **Setup** tab, then enter
the complete plain-language task in the **Chat** tab and send it. While the
task runs, the chat shows the agent's full observe–act loop live — one
collapsible row per tool call, with the raw payload behind each row — and
confirmed durable actions append to the code panel the moment they are
captured. On completion the run collapses into one summary bubble listing only
the durable steps written to the spec. Click and type use current target
references from product-owned accessibility observations. Only one AI
Authoring run may be active at a time; **Stop** cancels the active run at its
next loop boundary and keeps the steps confirmed before the stop.

When the agent needs a decision it can ask one clarification question in the
chat. Enter a response and select **Continue** to resume the same in-memory
task with a refreshed browser observation. Starting another task remains
disabled while it is waiting.

When a browser task requires a file chooser, the agent can use a fixed
`upload_test_file` capability after opening the chooser. It always uploads the
repository fixture `src/fixtures/test.txt`; the model cannot select local paths.

### Run setup (NCRMS STD log in)

**Run setup** in the Setup tab wraps the fixed NCRMS STD one-click login. The
preconfigured setup dropdowns (CRMS → environment → account) are static
single-option lists defined in source, not authorable in the UI. Set
`NCRMS_STD_USERNAME` and `NCRMS_STD_PASSWORD` in `.env` before using it. Its
confirmed navigation, fills, and Login click are appended to the document as
`⚙` setup lines, the rail flips to Chat with a **Setup Ran** receipt, and the
lifecycle chip shows **✓ setup complete**.

### Direct Step Console (development only)

Use the Direct Step Console to verify TestGen's product-routed browser tools
against the CRMS non-production login page. In a normal `npm run dev` launch,
open it from the **ⓘ** legacy menu in the top bar. Tools mode
opens the normal TestGen browser window and a separate, resizable Direct Step
Console window automatically:

```powershell
$env:TESTGEN_TARGET_URL = 'https://ncrmsstd.digitalinfuzion.com/NCRMS/Main/Login.aspx'
npm run dev:tools
```

The console exposes only `browser_snapshot`, `browser_navigate(url)`,
`browser_click(target)`, and `browser_type(target, text)`. Start with a
snapshot, copy a current target reference from the raw accessibility output,
then use it with click or type and snapshot again to inspect the result. The
console sends every request through TestGen's preload bridge, main-process
controller, BrowserSession, and Playwright MCP adapter; it does not create
test steps, save selectors, record actions, or expose arbitrary MCP tools.

The console window owns no browser or browser lifecycle; it drives the one
embedded browser in the main TestGen window. The launcher and console are
available only to the development renderer, never a packaged application. The
non-functional authoring-shell panels remain available in the main window.

The console and the existing Inspector diagnostic both can control the visible
browser, so use them only on trusted local machines and safe non-production
pages. Browser availability is shown separately from a tool result: an action
error can be retried with another console request while the browser remains
ready. Only one console request runs at a time.

### Agent Testing Console (development only)

Use **Open Agent Testing Console** in the development main-window header to
open a separate diagnostic window for M06's bounded Browser Execution Agent.
It shares the normal AI Authoring configuration from `.env`;
no additional provider setting is needed.

The **Browser Execution Agent** panel accepts one complete browser task and
runs the same bounded agent and fixed product-owned browser route used by AI
Authoring. Its run report shows the agent's completion summary, an ordered
sequence of browser action categories, and diagnostic call usage. It is for
validating browser control and prompt behavior: inspect the visible browser to
confirm the result. Expand **Execution trace** to inspect each initial or
refreshed accessibility snapshot, the exact fixed-tool input requested by the
agent, and the browser result. Typed text is masked by default; use **Reveal
typed text** only when local diagnosis requires it. The console also shows the
incomplete standardized test-document JSON produced by a completed run. Each
successful click or fill has a validated CSS selector where capture succeeds
and, when MCP returned generated code, a `playwrightLocator`. The selector
also identifies its capture strategy: ID, attribute, link route, or structural
fallback. The console does not save or export the document, provide XPath
fallback, or invoke generic browser tools.

Set this development-only environment variable before `npm run dev` to open
the console automatically:

```powershell
$env:TESTGEN_AGENT_TESTING_CONSOLE = '1'
npm run dev
```

### Browser-session diagnostic workflow

`TESTGEN_TARGET_URL` is a development-only launch override. It is not a user setting, is not persisted, and is not part of a test. Use this two-terminal workflow to validate the live browser session with the CRMS non-production login page and MCP Inspector.

#### One-command Inspector workflow

```powershell
npm run dev:inspect
```

#### Terminal 1: start TestGen

From the repository root, start TestGen with the development target override:

```powershell
$env:TESTGEN_TARGET_URL = 'https://ncrmsstd.digitalinfuzion.com/NCRMS/Main/Login.aspx'
npm run dev
```

Keep this terminal and the TestGen window open. The terminal prints a line like:

```text
TestGen browser CDP endpoint: http://127.0.0.1:55620
```

Copy that **`http://`** endpoint. Do not copy Electron's separate `ws://.../devtools/browser/...` diagnostic URL. The CDP endpoint changes every TestGen launch and closes when TestGen closes.

#### Terminal 2: inspect the same browser

Open a second PowerShell window in the repository root. Set `TESTGEN_CDP_ENDPOINT` to the HTTP endpoint copied from Terminal 1, then start Inspector:

```powershell
$env:TESTGEN_CDP_ENDPOINT = 'http://127.0.0.1:55620'
npm run inspector
```

In Inspector:

1. Invoke `browser_tabs` with `action: list`.
2. Invoke `browser_tabs` with `action: select` and the embedded CRMS page's index.
3. Invoke `browser_snapshot`.

The snapshot must show CRMS login content and exclude TestGen host UI text. For a non-interactive tool-discovery check in the same Terminal 2 session, run:

```powershell
npm run inspector:tools
```

PowerShell environment variables belong only to the terminal in which they are set. `TESTGEN_TARGET_URL` belongs in Terminal 1; `TESTGEN_CDP_ENDPOINT` belongs in Terminal 2. If you open a new terminal, set the variable needed there again. TestGen does not read either browser-diagnostic variable from `.env`; the local `.env` file is reserved for future AI Authoring runtime configuration.

MCP Inspector is a root development-only diagnostic tool. It starts a second, local Playwright MCP process connected to TestGen's live loopback CDP endpoint. This provides an alternate view of the embedded browser when diagnosing CDP connectivity, Playwright MCP setup, or target selection.

Inspector does **not** start TestGen, reuse or replace TestGen's `BrowserSession` adapter, record browser actions, author a test, persist data, or export anything. TestGen's own adapter remains the primary product integration check. Inspector is useful when comparing a lower-level connection result with that product check.

`npm run inspector` validates that the supplied endpoint is an unauthenticated loopback HTTP endpoint, creates the MCP configuration temporarily, and opens Inspector. It does not save the endpoint or configuration in the repository. Inspector can invoke browser actions, so use it only on trusted local machines and safe non-production pages; it is a diagnostic tool, not a TestGen browser-control surface.

## Installation troubleshooting

If Electron-Vite reports that Electron is uninstalled, install the configured Electron binary locally:

```powershell
npx install-electron --no
```

## Verify

Run every baseline check from the repository root:

```powershell
npm run lint
npm run format
npm run typecheck
npm test
npm run build
```

To inspect the built application manually, run:

```powershell
npm run preview
```

For a browser-session manual check, run `npm run dev` and confirm that the browser pane's **Starting browser…** notice disappears once the session is ready and the embedded page becomes visible. An unreachable `TESTGEN_TARGET_URL`, such as `https://127.0.0.1:1`, must show the **✕ browser failed** notice in the pane — with its **Restart browser** action — and the locked composer hint, without starting any authoring workflow.

The browser connection spike remains independently runnable from `spikes/embedded-mcp-connection/`; follow its own [README](spikes/embedded-mcp-connection/README.md) and commands. It is not a dependency of the product shell.
