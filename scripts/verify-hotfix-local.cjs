const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const http = require('http');

async function test() {
  console.log('Starting preview server...');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    cwd: 'd:\\CareOne',
    shell: true,
  });

  // Wait for server to come up
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.launch({ headless: true });
  const viewports = [1920, 1366, 768, 390];

  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('http://localhost:4173/staff/signin', { waitUntil: 'networkidle' });

    // Check document overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Viewport ${w}px: scrollWidth=${scrollWidth}, innerWidth=${w}, overflow=${scrollWidth > w}`);

    // Check header and logo
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    console.log(`Viewport ${w}px: header x=${headerBox.x}, width=${headerBox.width}`);

    // Check BuildStamp presence
    const buildStamp = await page.locator('[data-testid="build-stamp"]').innerText().catch(() => 'None');
    console.log(`Viewport ${w}px: BuildStamp=${buildStamp}`);

    await page.screenshot({ path: `docs/review/screenshots/hotfix-staff-${w}px.png` });
    await page.close();
  }

  // Test sign-in failure message
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:4173/staff/signin', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'dr.rahul@example.com');
  await page.fill('input[type="password"]', 'DemoPassword123!');
  await page.waitForTimeout(1500); // Wait for security check
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const alertText = await page.locator('[role="alert"]').innerText().catch(() => 'None');
  console.log('UI Alert text on sign in attempt:', alertText);
  console.log('Console errors captured:', consoleErrors);

  await page.screenshot({ path: 'docs/review/screenshots/hotfix-friendly-error.png' });

  await browser.close();
  preview.kill();
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
