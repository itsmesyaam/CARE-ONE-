const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const http = require('http');
const path = require('node:path');

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function probe() {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          checkTimeout();
        }
      }).on('error', () => {
        checkTimeout();
      });
    }
    function checkTimeout() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Timeout waiting for preview server at ' + url));
      } else {
        setTimeout(probe, 250);
      }
    }
    probe();
  });
}

async function main() {
  const dir = path.resolve(__dirname, '../docs/review/screenshots');
  const refHtml = 'file:///' + path.resolve(__dirname, '../design/patient/reference/index.html').replace(/\\/g, '/');

  console.log('Starting preview server on port 4173...');
  const previewProcess = spawn('npx.cmd vite preview --host 127.0.0.1 --port 4173', { shell: true });
  previewProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
  previewProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('Preview server is up!');

    const browser = await chromium.launch();
    const context = await browser.newContext();

    // ─────────────────────────────────────────────────────────────
    // 1. DESIGN REFERENCE SCREENSHOTS (from design/patient/reference/index.html)
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Design Reference screenshots...');
    const refPage = await context.newPage({ viewport: { width: 1280, height: 800 } });
    await refPage.goto(refHtml, { waitUntil: 'load' });
    await refPage.waitForTimeout(500);

    // 1A. Design Sign-In Desktop EN
    // In Welcome view
    await refPage.screenshot({ path: path.join(dir, 'patient-design-signin-desktop-en.png') });
    console.log('Saved patient-design-signin-desktop-en.png');

    // 1B. Design Sign-In Desktop ML
    // Click ML button
    await refPage.locator('button:has-text("മലയാളം")').first().click();
    await refPage.waitForTimeout(300);
    await refPage.screenshot({ path: path.join(dir, 'patient-design-signin-desktop-ml.png') });
    console.log('Saved patient-design-signin-desktop-ml.png');

    // 1C. Design Sign-In Mobile ML (390x844)
    await refPage.setViewportSize({ width: 390, height: 844 });
    await refPage.screenshot({ path: path.join(dir, 'patient-design-signin-mobile-ml.png') });
    console.log('Saved patient-design-signin-mobile-ml.png');

    // 1D. Design Sign-In Mobile EN (390x844)
    await refPage.locator('button:has-text("EN")').first().click();
    await refPage.waitForTimeout(300);
    await refPage.screenshot({ path: path.join(dir, 'patient-design-signin-mobile-en.png') });
    console.log('Saved patient-design-signin-mobile-en.png');

    // Switch to Home screen via Screens button -> Home chip
    await refPage.locator('button:has-text("Screens")').first().click();
    await refPage.waitForTimeout(200);
    await refPage.locator('button.pchip:has-text("Home")').first().click();
    await refPage.waitForTimeout(400);

    // 1E. Design Home Mobile EN (390x844)
    await refPage.screenshot({ path: path.join(dir, 'patient-design-home-mobile-en.png') });
    console.log('Saved patient-design-home-mobile-en.png');

    // 1F. Design Home Mobile ML (390x844)
    // Switch lang via Screens panel or profile
    await refPage.locator('button:has-text("Screens")').first().click();
    await refPage.waitForTimeout(200);
    await refPage.locator('.proto-panel button:has-text("മലയാളം")').first().click();
    await refPage.waitForTimeout(200);
    await refPage.locator('.proto-panel button[aria-label="Close"]').first().click();
    await refPage.waitForTimeout(300);
    await refPage.screenshot({ path: path.join(dir, 'patient-design-home-mobile-ml.png') });
    console.log('Saved patient-design-home-mobile-ml.png');

    // 1G. Design Home Desktop ML (1280x800)
    await refPage.setViewportSize({ width: 1280, height: 800 });
    await refPage.waitForTimeout(300);
    await refPage.screenshot({ path: path.join(dir, 'patient-design-home-desktop-ml.png') });
    console.log('Saved patient-design-home-desktop-ml.png');

    // 1H. Design Home Desktop EN (1280x800)
    await refPage.locator('button:has-text("Screens")').first().click();
    await refPage.waitForTimeout(200);
    await refPage.locator('.proto-panel button:has-text("EN")').first().click();
    await refPage.waitForTimeout(200);
    await refPage.locator('.proto-panel button[aria-label="Close"]').first().click();
    await refPage.waitForTimeout(300);
    await refPage.screenshot({ path: path.join(dir, 'patient-design-home-desktop-en.png') });
    console.log('Saved patient-design-home-desktop-en.png');

    await refPage.close();

    // ─────────────────────────────────────────────────────────────
    // 2. AFTER SCREENSHOTS (from local CareOne implementation)
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing CareOne Patient Portal (After) screenshots...');
    const appPage = await context.newPage({ viewport: { width: 1280, height: 800 } });

    // 2A. Sign-in Desktop EN
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    // Make sure it's in EN
    const enToggle = appPage.locator('button:has-text("English"), button:has-text("EN")').first();
    if (await enToggle.isVisible()) await enToggle.click();
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-signin-desktop-en.png') });
    console.log('Saved patient-after-signin-desktop-en.png');

    // 2B. Sign-in Desktop ML
    await appPage.locator('button:has-text("മലയാളം")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-signin-desktop-ml.png') });
    console.log('Saved patient-after-signin-desktop-ml.png');

    // 2C. Sign-in Mobile ML (390x844)
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(200);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-signin-mobile-ml.png') });
    console.log('Saved patient-after-signin-mobile-ml.png');

    // 2D. Sign-in Mobile EN (390x844)
    await appPage.locator('button:has-text("English"), button:has-text("EN")').first().click();
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-signin-mobile-en.png') });
    console.log('Saved patient-after-signin-mobile-en.png');

    // 2E. Patient Home Desktop EN (1280x800)
    await appPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-home-desktop-en.png') });
    console.log('Saved patient-after-home-desktop-en.png');

    // 2F. Patient Home Desktop ML (1280x800)
    // Switch to ML via login or state
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await appPage.locator('button:has-text("മലയാളം")').first().click();
    await appPage.waitForTimeout(200);
    await appPage.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await appPage.waitForTimeout(400);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-home-desktop-ml.png') });
    console.log('Saved patient-after-home-desktop-ml.png');

    // 2G. Patient Home Mobile ML (390x844)
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-home-mobile-ml.png') });
    console.log('Saved patient-after-home-mobile-ml.png');

    // 2H. Patient Home Mobile EN (390x844)
    await appPage.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await appPage.locator('button:has-text("English"), button:has-text("EN")').first().click();
    await appPage.waitForTimeout(200);
    await appPage.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await appPage.setViewportSize({ width: 390, height: 844 });
    await appPage.waitForTimeout(300);
    await appPage.screenshot({ path: path.join(dir, 'patient-after-home-mobile-en.png') });
    console.log('Saved patient-after-home-mobile-en.png');

    await browser.close();
    console.log('All screenshots captured successfully!');
  } finally {
    // Kill the preview server process
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t'], { shell: true });
      } else {
        previewProcess.kill();
      }
    } catch {
      // ignore kill errors
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
