const http = require('node:http');

const cdpPort = Number.parseInt(process.env.SPIKE_CDP_PORT ?? '9222', 10);
const expectedTargetUrl = process.env.SPIKE_TEST_PAGE_URL ?? 'https://www.selenium.dev/selenium/web/web-form.html';

function getJson(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: cdpPort, path: pathname, timeout: 5_000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`CDP ${pathname} returned HTTP ${response.statusCode}.`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`CDP ${pathname} did not return JSON: ${error.message}`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('CDP endpoint did not respond within 5 seconds.')));
    request.on('error', reject);
  });
}

async function main() {
  const version = await getJson('/json/version');
  const targets = await getJson('/json/list');
  const embeddedTarget = targets.find((target) => target.type === 'page' && target.url === expectedTargetUrl);
  const hostTarget = targets.find((target) => target.type === 'page' && target.url.includes('/host.html'));

  if (!version.webSocketDebuggerUrl) {
    throw new Error('CDP version response has no webSocketDebuggerUrl.');
  }
  if (!embeddedTarget) {
    throw new Error(`CDP did not list the embedded test page: ${expectedTargetUrl}`);
  }
  if (!hostTarget) {
    throw new Error('CDP did not list the separate TestGen host page.');
  }

  console.log('CDP endpoint is reachable on loopback.');
  console.log(`Embedded target: ${embeddedTarget.title} (${embeddedTarget.url})`);
  console.log(`Host target: ${hostTarget.title} (${hostTarget.url})`);
  console.log('The distinct CDP targets establish the page-selection check for the Inspector procedure.');
}

main().catch((error) => {
  console.error(`Validation failed: ${error.message}`);
  process.exitCode = 1;
});
