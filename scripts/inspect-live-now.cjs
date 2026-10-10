const { chromium } = require('@playwright/test');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() });
  });

  page.on('requestfailed', req => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText
    });
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      failedRequests.push({
        url: resp.url(),
        status: resp.status(),
        statusText: resp.statusText()
      });
    }
  });

  console.log('Navigating to https://care-one.syam18official.workers.dev/staff/signin ...');
  const response = await page.goto('https://care-one.syam18official.workers.dev/staff/signin', {
    waitUntil: 'networkidle'
  });

  console.log('Response status:', response.status());
  console.log('Response headers:');
  for (const [k, v] of Object.entries(response.headers())) {
    if (k.includes('security') || k.includes('csp') || k.includes('content-type')) {
      console.log(`  ${k}: ${v}`);
    }
  }

  await page.screenshot({ path: 'docs/review/screenshots/live-inspect-staff-signin.png' });

  // Check header text & logo
  const headerText = await page.locator('header').innerText().catch(() => 'No header found');
  console.log('Header text:', headerText);

  // Check build stamp text
  const bodyText = await page.innerText('body');
  const stampMatch = bodyText.match(/git:[a-f0-9]+/i) || bodyText.match(/v\d+\.\d+\.\d+/i);
  console.log('Build stamp in body:', stampMatch ? stampMatch[0] : 'None found');

  // Fill in demo doctor credentials if fields exist
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  if (await emailInput.isVisible()) {
    await emailInput.fill('dr.rahul@example.com');
    await passwordInput.fill('DemoPassword123!');
    console.log('Filled credentials. Clicking submit button...');
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'docs/review/screenshots/live-inspect-after-submit.png' });

  // Get UI error text if any
  const alertText = await page.locator('[role="alert"]').innerText().catch(() => 'No alert found');
  console.log('Alert text:', alertText);

  console.log('--- CONSOLE LOGS ---');
  consoleLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  console.log('--- FAILED REQUESTS ---');
  failedRequests.forEach(r => console.log(JSON.stringify(r)));

  await browser.close();
}

run().catch(console.error);
