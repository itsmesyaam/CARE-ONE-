const { chromium } = require('@playwright/test');
const path = require('node:path');

async function testLive() {
  const browser = await chromium.launch();
  const screenshotDir = path.resolve(__dirname, '../docs/review/screenshots');
  const consoleErrors = [];

  // Wait a moment for Vercel propagation
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('Navigating to https://care-one-h7mc.vercel.app...');
  const res = await page.goto('https://care-one-h7mc.vercel.app', { waitUntil: 'networkidle' });
  console.log('Home status:', res.status());

  const homeText = await page.evaluate(() => document.body.innerText);
  console.log('Home text snippet:', homeText.slice(0, 150));

  await page.screenshot({ path: path.join(screenshotDir, 'live-home-desktop.png') });
  console.log('Saved live-home-desktop.png');

  // Navigate to login
  console.log('Navigating to https://care-one-h7mc.vercel.app/login...');
  const loginRes = await page.goto('https://care-one-h7mc.vercel.app/login', { waitUntil: 'networkidle' });
  console.log('Login status:', loginRes.status());

  const loginText = await page.evaluate(() => document.body.innerText);
  console.log('Login text snippet:', loginText.slice(0, 150));

  await page.screenshot({ path: path.join(screenshotDir, 'live-login-desktop.png') });
  console.log('Saved live-login-desktop.png');

  // Switch to mobile viewport 390px
  const mobilePage = await context.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('https://care-one-h7mc.vercel.app/login', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(screenshotDir, 'live-login-mobile.png') });
  console.log('Saved live-login-mobile.png');

  // Try Malayalam switch on mobile
  try {
    const mlButton = mobilePage.locator('button:has-text("മലയാളം")');
    if (await mlButton.isVisible()) {
      await mlButton.click();
      await mobilePage.waitForTimeout(300);
      await mobilePage.screenshot({ path: path.join(screenshotDir, 'live-login-mobile-ml.png') });
      console.log('Saved live-login-mobile-ml.png');
    }
  } catch (e) {
    console.log('Malayalam button click check:', e.message);
  }

  console.log('Console Errors:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
  return { consoleErrors, homeText, loginText };
}

testLive().catch(err => {
  console.error('Test live error:', err);
  process.exit(1);
});
