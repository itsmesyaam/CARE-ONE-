const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const browser = await chromium.launch();
  const screenshotDir = path.resolve(__dirname, '../docs/review/screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleLogs = [];
  const networkRequests = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfailed', req => {
    networkRequests.push({ url: req.url(), status: 'FAILED', failure: req.failure()?.errorText });
  });

  page.on('response', res => {
    networkRequests.push({ url: res.url(), status: res.status() });
  });

  console.log('--- NAVIGATING TO LIVE HOME ---');
  await page.goto('https://care-one-h7mc.vercel.app', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(screenshotDir, 'live-evidence-home-desktop.png') });

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(screenshotDir, 'live-evidence-home-mobile.png') });

  // Scripts in DOM
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script')).map(e => ({
      src: e.src,
      type: e.type,
      id: e.id,
      text: e.textContent.slice(0, 100),
    }))
  );

  const html = await page.content();

  // Navigate to live login
  console.log('--- NAVIGATING TO LIVE LOGIN ---');
  await page.goto('https://care-one-h7mc.vercel.app/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(screenshotDir, 'live-evidence-login-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: path.join(screenshotDir, 'live-evidence-login-desktop.png') });

  console.log('=== 1. LIVE CONSOLE LOGS ===');
  console.log(JSON.stringify(consoleLogs, null, 2));

  console.log('=== 2. NETWORK REQUESTS (SAMPLE) ===');
  console.log(JSON.stringify(networkRequests, null, 2));

  console.log('=== 3. SCRIPTS IN DOM ===');
  console.log(JSON.stringify(scripts, null, 2));

  console.log('=== 4. SOURCE FILE CHECK ===');
  const loadsSourceMain = html.includes('/src/main.tsx');
  const loadsBuiltIndex = html.includes('/assets/index-');
  console.log('Loads /src/main.tsx?', loadsSourceMain);
  console.log('Loads /assets/index-xxxx.js?', loadsBuiltIndex);

  await browser.close();
}

main().catch(err => {
  console.error('Error running live evidence:', err);
  process.exit(1);
});
