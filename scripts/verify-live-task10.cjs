const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// RFC 6238 TOTP generator
function getTotpToken(secret, timeStep = 30) {
  // Base32 decode
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1000000;

  return code.toString().padStart(6, '0');
}

async function verifyLive() {
  const screenshotDir = path.resolve(__dirname, '../docs/review/screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const targetUrl = 'https://care-one.syam18official.workers.dev';
  console.log(`Checking live target: ${targetUrl}...`);

  // 1. Fetch live version.json
  try {
    const versionRes = await fetch(`${targetUrl}/version.json`);
    const versionData = await versionRes.json();
    console.log('[Live Version]:', JSON.stringify(versionData));
  } catch (err) {
    console.error('[Version Fetch Error]:', err.message);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // 2. Visit Landing / Root
    console.log('Navigating to root landing page...');
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'task10-live-landing.png') });
    console.log('Saved task10-live-landing.png');

    // 3. Inspect Build Stamp on page
    const stampEl = page.locator('[data-testid="build-stamp"]');
    if (await stampEl.isVisible()) {
      const stampText = await stampEl.innerText();
      console.log('[Live Build Stamp Text]:', stampText);
    }

    // 4. Staff Sign In Page
    console.log('Navigating to /staff/signin...');
    await page.goto(`${targetUrl}/staff/signin`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'task10-live-staff-signin.png') });
    console.log('Saved task10-live-staff-signin.png');

    // 5. Patient Sign In Page
    console.log('Navigating to /patient/signin...');
    await page.goto(`${targetUrl}/patient/signin`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotDir, 'task10-live-patient-signin.png') });
    console.log('Saved task10-live-patient-signin.png');

    // 6. Test Doctor Sign-In
    console.log('Testing Doctor sign in on live site...');
    await page.goto(`${targetUrl}/staff/signin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Turnstile wait

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill('doctor@example.com');
      await passwordInput.fill('DemoPassword123!');
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(3000);

      // Check if TOTP prompt appeared
      const totpInput = page.locator(
        'input[name="code"], input[placeholder*="6-digit"], input[maxlength="6"]'
      );
      if (await totpInput.isVisible()) {
        const totpCode = getTotpToken('JBSWY3DPEHPK3PXR');
        console.log(`Entering live TOTP code for Doctor: ${totpCode}`);
        await totpInput.fill(totpCode);
        await page
          .locator('button[type="submit"]:has-text("Verify"), button:has-text("Verify")')
          .click();
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: path.join(screenshotDir, 'task10-live-doctor-screen.png') });
      console.log('Saved task10-live-doctor-screen.png');
    }
  } finally {
    await browser.close();
  }
}

verifyLive().catch((err) => {
  console.error('[Task 10 Live Verification Error]:', err);
});
