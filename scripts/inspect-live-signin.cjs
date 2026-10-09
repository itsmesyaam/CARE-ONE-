const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Launching browser to inspect https://care-one.syam18official.workers.dev/staff/signin...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkEvents = [];
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[BROWSER CONSOLE ${type.toUpperCase()}]: ${text}`);
    consoleMessages.push({ type, text, location: msg.location() });
  });

  page.on('pageerror', (err) => {
    console.log(`[PAGE ERROR]: ${err.message}`);
    pageErrors.push(err.message);
  });

  page.on('request', (req) => {
    networkEvents.push({ type: 'request', url: req.url(), method: req.method() });
  });

  page.on('response', (res) => {
    networkEvents.push({ type: 'response', url: res.url(), status: res.status(), headers: res.headers() });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    console.log(`[REQUEST FAILED]: ${req.method()} ${req.url()} - ${failure ? failure.errorText : 'unknown'}`);
    networkEvents.push({ type: 'failed', url: req.url(), method: req.method(), error: failure ? failure.errorText : 'unknown' });
  });

  console.log('Navigating to live page...');
  const response = await page.goto('https://care-one.syam18official.workers.dev/staff/signin', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  console.log('Main document status:', response ? response.status() : 'no response');
  if (response) {
    console.log('Main document headers:', JSON.stringify(response.headers(), null, 2));
  }

  // Wait for Turnstile / security check to complete if present
  console.log('Waiting for security check or form readiness...');
  await page.waitForTimeout(3000);

  // Take screenshot of initial state
  const evidenceDir = path.join(__dirname, '..', 'docs', 'review');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'live-signin-initial.png') });

  // Locate fields
  const emInput = page.locator('#staff-em');
  const pwInput = page.locator('#staff-pw');

  if (await emInput.isVisible()) {
    console.log('Filling demo doctor credentials...');
    await emInput.fill('dr.rahul@example.com');
  }
  if (await pwInput.isVisible()) {
    await pwInput.fill('DemoPassword123!');
  }

  // Check submit button
  const submitBtn = page.locator('button[type="submit"]');
  console.log('Submit button visible:', await submitBtn.isVisible());
  console.log('Submit button disabled:', await submitBtn.isDisabled());

  // Click submit
  console.log('Clicking Sign in button...');
  await submitBtn.click();

  // Wait for network activity or error to display
  await page.waitForTimeout(5000);

  // Take screenshot after click
  await page.screenshot({ path: path.join(evidenceDir, 'live-signin-failed.png') });

  // Capture visible text
  const bodyText = await page.locator('body').innerText();
  console.log('\n--- VISIBLE TEXT ON SCREEN ---');
  console.log(bodyText);
  console.log('-------------------------------\n');

  // Write collected evidence to json
  const report = {
    url: 'https://care-one.syam18official.workers.dev/staff/signin',
    mainStatus: response ? response.status() : null,
    responseHeaders: response ? response.headers() : {},
    consoleMessages,
    pageErrors,
    networkEvents: networkEvents.filter(e => !e.url.endsWith('.png') && !e.url.endsWith('.ico')),
  };

  fs.writeFileSync(path.join(evidenceDir, 'live-signin-evidence.json'), JSON.stringify(report, null, 2));
  console.log('Evidence written to docs/review/live-signin-evidence.json');

  await browser.close();
})();
