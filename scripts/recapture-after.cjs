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
  console.log('Starting preview server on port 4173...');
  const previewProcess = spawn('npx.cmd vite preview --host 127.0.0.1 --port 4173', { shell: true });

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('Preview server ready.');

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage({ viewport: { width: 1280, height: 800 } });

    // 1. Sign-in Desktop EN
    await page.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    const enBtn = page.locator('button:has-text("English"), button:has-text("EN")').first();
    if (await enBtn.isVisible()) await enBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'patient-after-signin-desktop-en.png') });
    console.log('Saved patient-after-signin-desktop-en.png');

    // 2. Sign-in Desktop ML
    const mlBtn = page.locator('button:has-text("മലയാളം")').first();
    await mlBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'patient-after-signin-desktop-ml.png') });
    console.log('Saved patient-after-signin-desktop-ml.png');

    // 3. Sign-in Mobile ML
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'patient-after-signin-mobile-ml.png') });
    console.log('Saved patient-after-signin-mobile-ml.png');

    // 4. Sign-in Mobile EN
    await page.locator('button:has-text("English"), button:has-text("EN")').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, 'patient-after-signin-mobile-en.png') });
    console.log('Saved patient-after-signin-mobile-en.png');

    // 5. Patient Home Mobile EN
    await page.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'patient-after-home-mobile-en.png') });
    console.log('Saved patient-after-home-mobile-en.png');

    // 6. Patient Home Mobile ML
    await page.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await page.locator('button:has-text("മലയാളം")').first().click();
    await page.waitForTimeout(200);
    await page.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'patient-after-home-mobile-ml.png') });
    console.log('Saved patient-after-home-mobile-ml.png');

    // 7. Patient Home Desktop ML
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'patient-after-home-desktop-ml.png') });
    console.log('Saved patient-after-home-desktop-ml.png');

    // 8. Patient Home Desktop EN
    await page.goto('http://127.0.0.1:4173/patient/login', { waitUntil: 'networkidle' });
    await page.locator('button:has-text("English"), button:has-text("EN")').first().click();
    await page.waitForTimeout(200);
    await page.goto('http://127.0.0.1:4173/patient', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'patient-after-home-desktop-en.png') });
    console.log('Saved patient-after-home-desktop-en.png');

    await browser.close();
  } finally {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', previewProcess.pid.toString(), '/f', '/t'], { shell: true });
      } else {
        previewProcess.kill();
      }
    } catch {
      // ignore
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
