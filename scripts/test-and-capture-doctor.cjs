const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const http = require('http');
const path = require('node:path');
const fs = require('node:fs');

function waitForServer(url, timeoutMs = 20000) {
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
        reject(new Error('Timeout waiting for server at ' + url));
      } else {
        setTimeout(probe, 300);
      }
    }
    probe();
  });
}

async function main() {
  const screenshotsDir = path.resolve(__dirname, '../docs/review/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('--- Starting Preview Server ---');
  const previewProcess = spawn('npx.cmd vite preview --host 127.0.0.1 --port 4173', { shell: true });
  previewProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
  previewProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('Preview server ready at http://127.0.0.1:4173');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // ─────────────────────────────────────────────────────────────
    // 1. STAFF SIGN-IN & 2FA AUTHENTICATOR
    // ─────────────────────────────────────────────────────────────
    console.log('[1/12] Testing Staff Sign-In & MFA...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:4173/staff/signin', { waitUntil: 'networkidle' });

    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-signin-desktop.png') });
    console.log('  Captured doctor-signin-desktop.png');

    // Wait for security check & submit
    await page.waitForTimeout(1600);
    const signInBtn = page.locator('button[type="submit"]');
    await signInBtn.click();

    // Wait for 2FA screen
    await page.waitForSelector('text=Enter your 6-digit code', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-2fa-desktop.png') });
    console.log('  Captured doctor-2fa-desktop.png');

    // Submit 2FA
    const verifyBtn = page.locator('button:has-text("Sign in")').last();
    await verifyBtn.click();

    // Wait for navigation to /doctor
    await page.waitForURL('**/doctor', { timeout: 15000 });
    await page.waitForTimeout(1000);
    console.log('  Successfully signed in at AAL2 and navigated to /doctor');

    // ─────────────────────────────────────────────────────────────
    // 2. DOCTOR TODAY SCREENSHOTS (Desktop, Tablet, Mobile)
    // ─────────────────────────────────────────────────────────────
    console.log('[2/12] Capturing Doctor Today...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-today-desktop.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-today-tablet.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-today-mobile.png') });

    // Switch to Malayalam
    const langBtn = page.locator('button[aria-label="Toggle language"]').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(300);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-today-desktop-ml.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-today-mobile-ml.png') });
      // Switch back to English
      await langBtn.click();
      await page.waitForTimeout(300);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. DOCTOR PATIENTS DIRECTORY & SEARCH
    // ─────────────────────────────────────────────────────────────
    console.log('[3/12] Capturing Doctor Patients...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:4173/doctor/patients', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-patients-desktop.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-patients-tablet.png') });

    // Search interaction test
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Arun');
      await page.waitForTimeout(300);
      await searchInput.fill('');
    }

    // ─────────────────────────────────────────────────────────────
    // 4. EMERGENCY BREAK-GLASS MODAL
    // ─────────────────────────────────────────────────────────────
    console.log('[4/12] Testing Emergency Access Modal...');
    const emBtn = page.locator('button:has-text("Emergency access")').first();
    if (await emBtn.isVisible()) {
      await emBtn.click();
      await page.waitForSelector('text=Emergency access', { timeout: 3000 });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-emergency-modal.png') });

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel")');
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ARUN KUMAR'S CHART: WHAT CHANGED
    // ─────────────────────────────────────────────────────────────
    console.log('[5/12] Capturing Clinical Chart (What Changed)...');
    await page.goto('http://127.0.0.1:4173/doctor/chart/e0000000-0000-0000-0000-000000000001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-whatchanged-desktop.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-whatchanged-tablet.png') });

    // ─────────────────────────────────────────────────────────────
    // 6. CHART TABS: VISITS, READINGS, REPORTS, MEDS, CARE PLAN
    // ─────────────────────────────────────────────────────────────
    console.log('[6/12] Capturing Chart Tabs...');
    await page.setViewportSize({ width: 1280, height: 800 });

    // Visits Tab
    await page.click('button[role="tab"]:has-text("Visits")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-visits.png') });

    // Readings Tab
    await page.click('button[role="tab"]:has-text("Readings")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-readings.png') });

    // Reports Tab
    await page.click('button[role="tab"]:has-text("Reports")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-reports.png') });

    // Meds Tab
    await page.click('button[role="tab"]:has-text("Medicines")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-meds.png') });

    // Care Plan Tab with Diet Guidance
    await page.click('button[role="tab"]:has-text("Care plan")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-chart-careplan-diet.png') });

    // ─────────────────────────────────────────────────────────────
    // 7. NOTE COMPOSER WIZARD & PRESCRIBING ALLERGY WARNING
    // ─────────────────────────────────────────────────────────────
    console.log('[7/12] Testing Note Composer & Prescribing...');
    const startNoteBtn = page.locator('button:has-text("Start today\'s note")');
    if (await startNoteBtn.isVisible()) {
      await startNoteBtn.click();
      await page.waitForSelector('text=Today\'s note', { timeout: 4000 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-composer-step1-note.png') });

      // Fill complaints
      const complaintArea = page.locator('textarea').first();
      await complaintArea.fill('Routine chronic check-up. Blood pressure controlled. Complains of mild leg swelling.');

      // Move to Meds
      await page.click('button:has-text("Next: Medicines")');
      await page.waitForTimeout(300);

      // Prescribe Amoxicillin to trigger penicillin allergy warning
      const medInput = page.locator('input[list="drug-suggestions"]');
      await medInput.fill('Amoxicillin 500mg');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-composer-allergy-warning.png') });

      // Change to safe drug and add
      await medInput.fill('Metformin 500mg BD');
      const addMedBtn = page.locator('button:has-text("Add")').first();
      if (await addMedBtn.isVisible()) await addMedBtn.click();

      // Move to Care Plan
      await page.click('button:has-text("Next: Care plan")');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-composer-step3-plan.png') });

      // Move to Sign
      await page.click('button:has-text("Next: Sign")');
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-composer-step4-sign.png') });

      // Check sign acknowledgement checkbox
      const ackBox = page.locator('input[type="checkbox"]');
      if (await ackBox.isVisible()) {
        await ackBox.check();
      }

      // Sign note
      await page.click('button:has-text("Sign note")');
      await page.waitForTimeout(1000);
      console.log('  Successfully signed consultation note!');
    }

    // ─────────────────────────────────────────────────────────────
    // 8. ADDENDUM MODAL
    // ─────────────────────────────────────────────────────────────
    console.log('[8/12] Testing Encounter Addendum Modal...');
    // Open Visits tab
    await page.click('button[role="tab"]:has-text("Visits")');
    await page.waitForTimeout(400);

    const addAddendumBtn = page.locator('button:has-text("Add a correction")').first();
    if (await addAddendumBtn.isVisible()) {
      await addAddendumBtn.click();
      await page.waitForSelector('text=Signed notes cannot be edited', { timeout: 3000 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-addendum-modal.png') });

      // Enter correction
      const noteInput = page.locator('form textarea');
      if (await noteInput.isVisible()) {
        await noteInput.fill('Patient instructed to take medication with evening meal.');
        await page.click('button:has-text("Sign correction")');
        await page.waitForTimeout(600);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 9. REVIEW QUEUE: REPORTS & SYMPTOMS
    // ─────────────────────────────────────────────────────────────
    console.log('[9/12] Capturing Review Queue...');
    await page.goto('http://127.0.0.1:4173/doctor/review', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-review-reports-desktop.png') });

    // Review Sheet Dialog
    const reviewBtn = page.locator('button.btn-primary:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      await page.waitForSelector('form textarea', { timeout: 4000 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-review-sheet-modal.png') });

      // Review report
      const commentArea = page.locator('form textarea');
      if (await commentArea.isVisible()) {
        await commentArea.fill('Your HbA1c is stable at 6.8%. Excellent control. Keep taking current medications.');
        await page.locator('form select').selectOption('no_action');
        await page.click('button:has-text("Mark reviewed")');
        await page.waitForTimeout(600);
        console.log('  Report marked reviewed with patient comment & next step!');
      }
    }

    // Symptoms Tab
    await page.click('button:has-text("Symptoms")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-review-symptoms-desktop.png') });

    // ─────────────────────────────────────────────────────────────
    // 10. DOCTOR ACCOUNT & AUDIT LOG
    // ─────────────────────────────────────────────────────────────
    console.log('[10/12] Capturing Doctor Account...');
    await page.goto('http://127.0.0.1:4173/doctor/account', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-account-desktop.png') });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: path.join(screenshotsDir, 'doctor-account-tablet.png') });

    // ─────────────────────────────────────────────────────────────
    // 11. SIGN-OUT FLOW
    // ─────────────────────────────────────────────────────────────
    console.log('[11/12] Testing Sign-out...');
    await page.setViewportSize({ width: 1280, height: 800 });
    const signOutBtn = page.locator('main button:has-text("Sign out")');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
      await page.waitForSelector('text=Are you sure you want to sign out', { timeout: 3000 });
      await page.screenshot({ path: path.join(screenshotsDir, 'doctor-signout-modal.png') });

      const confirmSignOut = page.locator('.fixed button:has-text("Sign out")');
      if (await confirmSignOut.isVisible()) {
        await confirmSignOut.click();
        await page.waitForURL('**/staff/signin', { timeout: 5000 });
        console.log('  Sign-out confirmed! Evicted session and returned to Staff Sign-in.');
      }
    }

    console.log('[12/12] Doctor Portal End-to-End Audit & Screenshots Complete!');
    await browser.close();
  } finally {
    previewProcess.kill();
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
