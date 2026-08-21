const path = require('node:path');
const { app, BrowserWindow, WebContentsView } = require('electron');

const cdpPort = Number.parseInt(process.env.SPIKE_CDP_PORT ?? '9222', 10);
const targetUrl = process.env.SPIKE_TEST_PAGE_URL ?? 'https://www.selenium.dev/selenium/web/web-form.html';

if (!Number.isInteger(cdpPort) || cdpPort < 1 || cdpPort > 65535) {
  throw new Error('SPIKE_CDP_PORT must be a valid TCP port.');
}

// The debugging endpoint is intentionally loopback-only. It exists solely for
// the local Playwright MCP connection validated by this disposable spike.
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
app.commandLine.appendSwitch('remote-debugging-port', String(cdpPort));

let mainWindow;
let embeddedBrowser;

function layoutEmbeddedBrowser() {
  if (!mainWindow || !embeddedBrowser) {
    return;
  }

  const { width, height } = mainWindow.getContentBounds();
  const toolbarHeight = 88;
  embeddedBrowser.setBounds({ x: 0, y: toolbarHeight, width, height: Math.max(0, height - toolbarHeight) });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await mainWindow.loadFile(path.join(__dirname, 'host.html'));

  embeddedBrowser = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.contentView.addChildView(embeddedBrowser);
  layoutEmbeddedBrowser();
  mainWindow.on('resize', layoutEmbeddedBrowser);

  embeddedBrowser.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error(`Embedded test page failed to load (${errorCode}: ${errorDescription}): ${validatedUrl}`);
  });
  embeddedBrowser.webContents.on('did-finish-load', () => {
    console.log(`Embedded page loaded: ${embeddedBrowser.webContents.getURL()}`);
  });

  console.log(`CDP endpoint: http://127.0.0.1:${cdpPort}`);
  console.log(`Embedded WebContents id: ${embeddedBrowser.webContents.id}`);
  console.log(`Embedded public test page: ${targetUrl}`);
  await embeddedBrowser.webContents.loadURL(targetUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
