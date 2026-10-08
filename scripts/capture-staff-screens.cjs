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

    // ─────────────────────────────────────────────────────────────
    // SCREEN 1: Staff Sign-In & 2FA
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Staff Sign-In screenshots...');

    // 1A. Staff Sign-in Desktop EN
    const pageDesktop = await context.newPage();
    await pageDesktop.setViewportSize({ width: 1280, height: 800 });
    await pageDesktop.goto('http://127.0.0.1:4173/staff/signin', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(1400); // Wait for security check animation to complete
    await pageDesktop.screenshot({ path: path.join(dir, 'staff-signin-desktop-en.png') });
    console.log('Saved staff-signin-desktop-en.png');

    // 1B. Staff Sign-in Desktop ML
    await pageDesktop.locator('button[aria-label="Toggle language"]').click();
    await pageDesktop.waitForTimeout(400);
    await pageDesktop.screenshot({ path: path.join(dir, 'staff-signin-desktop-ml.png') });
    console.log('Saved staff-signin-desktop-ml.png');

    // 1C. Staff Sign-in Mobile EN & ML
    const pageMobile = await context.newPage();
    await pageMobile.setViewportSize({ width: 390, height: 844 });
    await pageMobile.goto('http://127.0.0.1:4173/staff/signin', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(1400);
    await pageMobile.screenshot({ path: path.join(dir, 'staff-signin-mobile-en.png') });
    console.log('Saved staff-signin-mobile-en.png');

    await pageMobile.locator('button[aria-label="Toggle language"]').click();
    await pageMobile.waitForTimeout(400);
    await pageMobile.screenshot({ path: path.join(dir, 'staff-signin-mobile-ml.png') });
    console.log('Saved staff-signin-mobile-ml.png');

    // 1D. Staff 2FA Verification (Desktop & Mobile)
    await pageDesktop.goto('http://127.0.0.1:4173/staff/signin', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(1400);
    await pageDesktop.locator('button[type="submit"]:has-text("Sign in")').click();
    await pageDesktop.waitForTimeout(800);
    await pageDesktop.screenshot({ path: path.join(dir, 'staff-twofa-desktop-en.png') });
    console.log('Saved staff-twofa-desktop-en.png');

    await pageMobile.goto('http://127.0.0.1:4173/staff/signin', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(1400);
    await pageMobile.locator('button[type="submit"]:has-text("Sign in")').click();
    await pageMobile.waitForTimeout(800);
    await pageMobile.screenshot({ path: path.join(dir, 'staff-twofa-mobile-en.png') });
    console.log('Saved staff-twofa-mobile-en.png');

    // 1E. Staff Enroll Wizard (Desktop & Mobile)
    await pageDesktop.locator('button:has-text("Setting up two-factor for the first time?")').click();
    await pageDesktop.waitForTimeout(400);
    await pageDesktop.screenshot({ path: path.join(dir, 'staff-enroll-desktop-en.png') });
    console.log('Saved staff-enroll-desktop-en.png');

    await pageMobile.locator('button:has-text("Setting up two-factor for the first time?")').click();
    await pageMobile.waitForTimeout(400);
    await pageMobile.screenshot({ path: path.join(dir, 'staff-enroll-mobile-en.png') });
    console.log('Saved staff-enroll-mobile-en.png');

    // 1F. Screen Lock (Desktop & Mobile)
    // Go to doctor today and click lock
    await pageDesktop.goto('http://127.0.0.1:4173/doctor', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.locator('button:has-text("Lock")').first().click();
    await pageDesktop.waitForTimeout(400);
    await pageDesktop.screenshot({ path: path.join(dir, 'staff-lock-desktop-en.png') });
    console.log('Saved staff-lock-desktop-en.png');

    await pageMobile.goto('http://127.0.0.1:4173/doctor', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(500);
    await pageMobile.locator('button[aria-label="Lock screen"]').first().click();
    await pageMobile.waitForTimeout(400);
    await pageMobile.screenshot({ path: path.join(dir, 'staff-lock-mobile-en.png') });
    console.log('Saved staff-lock-mobile-en.png');

    // ─────────────────────────────────────────────────────────────
    // SCREEN 2: Doctor Today Screen
    // ─────────────────────────────────────────────────────────────
    console.log('Capturing Doctor Today Screen screenshots...');

    // 2A. Doctor Today Desktop EN
    await pageDesktop.goto('http://127.0.0.1:4173/doctor', { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(600);
    await pageDesktop.screenshot({ path: path.join(dir, 'doctor-today-desktop-en.png') });
    console.log('Saved doctor-today-desktop-en.png');

    // 2B. Doctor Today Desktop ML
    await pageDesktop.locator('aside button[aria-label="Toggle language"]').click();
    await pageDesktop.waitForTimeout(400);
    await pageDesktop.screenshot({ path: path.join(dir, 'doctor-today-desktop-ml.png') });
    console.log('Saved doctor-today-desktop-ml.png');

    // 2C. Doctor Today Mobile EN
    await pageMobile.goto('http://127.0.0.1:4173/doctor', { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(600);
    await pageMobile.screenshot({ path: path.join(dir, 'doctor-today-mobile-en.png') });
    console.log('Saved doctor-today-mobile-en.png');

    // 2D. Doctor Today Mobile ML
    await pageMobile.locator('header button[aria-label="Toggle language"]').click();
    await pageMobile.waitForTimeout(400);
    await pageMobile.screenshot({ path: path.join(dir, 'doctor-today-mobile-ml.png') });
    console.log('Saved doctor-today-mobile-ml.png');

    await browser.close();
    console.log('All staff & doctor screenshots captured successfully!');
  } finally {
    previewProcess.kill();
  }
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
