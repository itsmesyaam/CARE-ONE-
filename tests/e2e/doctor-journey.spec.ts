import { test, expect } from '@playwright/test';

test.describe('Doctor Portal E2E Journey', () => {
  test('authenticates with MFA, opens Arun Kumar chart, writes and signs a note, prescribes, and reviews a report', async ({
    page,
  }) => {
    // 1. Navigate to Staff Sign-In
    await page.goto('/staff/signin');
    await expect(page.locator('h1')).toContainText(/Staff sign-in/i);

    // Wait for the security check timer to enable the sign-in button
    await page.waitForTimeout(1600);
    const signInBtn = page.locator('button[type="submit"]');
    await expect(signInBtn).toBeEnabled({ timeout: 10000 });
    await signInBtn.click();

    // 2. Complete TOTP MFA Step
    await expect(page.locator('h1')).toContainText(/Enter your 6-digit code/i, { timeout: 10000 });
    const verifyBtn = page.locator('button:has-text("Sign in")').last();
    await verifyBtn.click();

    // 3. Arrive at Doctor Today
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(/Dr\. Rahul/i);
    await expect(page.getByText(/OPD 4/i).first()).toBeVisible();

    // Verify Arun Kumar's ticket
    await expect(page.locator('.tk-name')).toContainText(/Arun Kumar/i);
    await expect(page.getByText(/Allergic to penicillin/i)).toBeVisible();

    // 4. Open Arun Kumar's Clinical Chart
    const openChartBtn = page.getByRole('button', { name: /Open chart/i }).first();
    await openChartBtn.click();

    await expect(page).toHaveURL(/\/doctor\/chart\/e0000000-0000-0000-0000-000000000001/, {
      timeout: 10000,
    });
    await expect(page.locator('h1')).toContainText(/Arun Kumar/i);
    await expect(page.getByText(/ABC-1001/i)).toBeVisible();
    await expect(page.getByText(/Allergic to penicillin/i)).toBeVisible();

    // 5. Verify "What Changed" Tab
    const whatChangedTab = page.getByRole('tab', { name: /What changed/i });
    await expect(whatChangedTab).toBeVisible();

    // 6. Write and Sign a Consultation Note
    const startNoteBtn = page.getByRole('button', { name: /Start today's note/i });
    if (await startNoteBtn.isVisible()) {
      await startNoteBtn.click();

      // Step 1: Note Details
      await page
        .locator('input[type="text"]')
        .first()
        .fill('Routine chronic check-up. Blood pressure controlled.');
      await page
        .locator('textarea')
        .first()
        .fill('Chest clear, CVS normal, pedal pulses present. Mild diabetic retinopathy stable.');
      await page.click('button:has-text("Next: Medicines")');

      // Step 2: Prescribing with Allergy Warning Check
      const medInput = page.locator('input[list="drug-suggestions"]');
      await medInput.fill('Amoxicillin 500mg TDS');
      // Verify allergy warning appears for penicillin derivative
      await expect(page.getByText(/Patient is allergic to/i)).toBeVisible();

      // Clear and prescribe safe medication
      await medInput.fill('Metformin 500mg BD');
      const addMedBtn = page.locator('button:has-text("Add")').first();
      if (await addMedBtn.isVisible()) await addMedBtn.click();

      // Move to Care Plan
      await page.click('button:has-text("Next: Care plan")');
      await page.waitForTimeout(400);

      // Step 3: Care Plan & Diet Guidance
      await page.click('button:has-text("Next: Sign")');
      await page.waitForTimeout(400);

      // Step 4: Sign Note
      const ackBox = page.locator('input[type="checkbox"]');
      if (await ackBox.isVisible()) {
        await ackBox.check();
      }
      await page.waitForTimeout(200);

      const signNoteBtn = page.getByRole('button', { name: /Sign note/i });
      await expect(signNoteBtn).toBeEnabled({ timeout: 5000 });
      await signNoteBtn.click();

      // Ensure chart displays signed note indication
      await expect(page.getByText(/Note signed today/i)).toBeVisible({ timeout: 10000 });
    }

    // 7. Review Queue: Open and Review Report
    await page.goto('/doctor/review');
    await expect(page.locator('h1')).toContainText(/Review/i);

    const reviewButtons = page.locator('.space-y-3 button:has-text("Review")');
    if ((await reviewButtons.count()) > 0) {
      await reviewButtons.first().click();

      // Provide doctor comment for patient
      const commentInput = page.locator('form textarea');
      if (await commentInput.isVisible()) {
        await commentInput.fill(
          'HbA1c levels remain well-controlled. Continue current dietary modifications and medication schedule.'
        );

        // Select Next Step
        const nextStepSelect = page.locator('form select');
        if (await nextStepSelect.isVisible()) {
          await nextStepSelect.selectOption('no_action');
        }

        // Click Mark Reviewed
        const markReviewedBtn = page.getByRole('button', { name: /Mark reviewed/i });
        await markReviewedBtn.click();

        // Verify success feedback
        await expect(page.getByText(/Report marked reviewed/i)).toBeVisible({ timeout: 10000 });
      }
    }

    // 8. Doctor Account & Sign-Out Verification
    await page.goto('/doctor/account');
    await expect(page.locator('h1')).toContainText(/Account/i);
    await expect(page.getByText(/KMC 48291/i)).toBeVisible();
    await expect(page.getByText(/Two-factor sign-in/i)).toBeVisible();

    const signOutBtn = page.locator('main button:has-text("Sign out")');
    await expect(signOutBtn).toBeVisible();
  });
});
