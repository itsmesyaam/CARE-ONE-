import { test, expect } from '@playwright/test';

test.describe('Live End-to-End: One-Tap Demo Login on Both Login Pages', () => {
  const DEMO_PASSWORD = 'DemoPassword123!';

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // Helper to safely sign out from patient or staff portal
  async function signOut(page: import('@playwright/test').Page) {
    const signOutBtn = page
      .locator(
        'button:has-text("Sign Out"), button:has-text("Sign out"), button[aria-label="Sign out"], button[aria-label="ലോഗ് ഔട്ട്"], button:has-text("ലോഗ് ഔട്ട്")'
      )
      .first();
    if (await signOutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signOutBtn.click();
      await page.waitForURL(/\/($|patient\/login|staff\/signin)/, { timeout: 10000 }).catch(() => {});
    }
    await page.context().clearCookies();
  }

  // ─── Patient Login Tests ──────────────────────────────────────────────────

  test('Patient Login: Arun Kumar one-tap fill -> verify inputs -> sign in -> lands on /patient', async ({ page }) => {
    await page.goto('/patient/login');

    // Wait for demo accounts card
    const arunBtn = page.locator('button', { hasText: 'Arun Kumar' }).first();
    await expect(arunBtn).toBeVisible({ timeout: 15000 });

    // Tap Arun Kumar button
    await arunBtn.click();

    // Verify fields populated in DOM & React state
    await expect(page.locator('#username')).toHaveValue('ABC-1001');
    await expect(page.locator('#password')).toHaveValue(DEMO_PASSWORD);

    // Verify submit button is focused
    await expect(page.locator('button[type="submit"]')).toBeFocused();

    // Submit form
    await page.click('button[type="submit"]');

    // Verify lands on /patient
    await expect(page).toHaveURL(/\/patient/, { timeout: 15000 });

    await signOut(page);
  });

  test('Patient Login: Sujatha Nair "Fill and sign in" one-tap login', async ({ page }) => {
    await page.goto('/patient/login');

    const fillSignInBtn = page
      .locator('span', { hasText: 'ABC-1002' })
      .locator('..')
      .locator('button', { hasText: /Fill and sign in|ഫിൽ ചെയ്ത്/ });
    await expect(fillSignInBtn).toBeVisible({ timeout: 15000 });
    await fillSignInBtn.click();

    // Directly lands on /patient
    await expect(page).toHaveURL(/\/patient/, { timeout: 15000 });

    await signOut(page);
  });

  // ─── Staff Login Tests ────────────────────────────────────────────────────

  test('Staff Login: Dr. Rahul one-tap fill -> verify inputs -> sign in -> lands on /doctor', async ({ page }) => {
    await page.goto('/staff/signin');

    const rahulBtn = page.locator('button', { hasText: 'Dr. Rahul' }).first();
    await expect(rahulBtn).toBeVisible({ timeout: 15000 });

    await rahulBtn.click();

    await expect(page.locator('#username')).toHaveValue('dr.rahul@example.com');
    await expect(page.locator('#password')).toHaveValue(DEMO_PASSWORD);
    await expect(page.locator('button[type="submit"]')).toBeFocused();

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });

    await signOut(page);
  });

  test('Staff Login: Dr. Anjali "Fill and sign in" one-tap login', async ({ page }) => {
    await page.goto('/staff/signin');

    const fillSignInBtn = page
      .locator('span', { hasText: 'dr.anjali@example.com' })
      .locator('..')
      .locator('button', { hasText: /Fill and sign in|ഫിൽ ചെയ്ത്/ });
    await expect(fillSignInBtn).toBeVisible({ timeout: 15000 });
    await fillSignInBtn.click();

    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });

    await signOut(page);
  });

  test('Staff Login: Dr. Thomas one-tap fill -> sign in -> lands on /doctor', async ({ page }) => {
    await page.goto('/staff/signin');

    const thomasBtn = page.locator('button', { hasText: 'Dr. Thomas' }).first();
    await expect(thomasBtn).toBeVisible({ timeout: 15000 });

    await thomasBtn.click();

    await expect(page.locator('#username')).toHaveValue('dr.thomas@example.com');
    await expect(page.locator('#password')).toHaveValue(DEMO_PASSWORD);

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });

    await signOut(page);
  });

  test('Staff Login: Front Desk "Fill and sign in" one-tap login', async ({ page }) => {
    await page.goto('/staff/signin');

    const fillSignInBtn = page
      .locator('span', { hasText: 'desk@example.com' })
      .locator('..')
      .locator('button', { hasText: /Fill and sign in|ഫിൽ ചെയ്ത്/ });
    await expect(fillSignInBtn).toBeVisible({ timeout: 15000 });
    await fillSignInBtn.click();

    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });

    await signOut(page);
  });

  test('Staff Login: Admin "Fill and sign in" one-tap login -> lands on /admin', async ({ page }) => {
    await page.goto('/staff/signin');

    const fillSignInBtn = page
      .locator('span', { hasText: 'admin@example.com' })
      .locator('..')
      .locator('button', { hasText: /Fill and sign in|ഫിൽ ചെയ്ത്/ });
    await expect(fillSignInBtn).toBeVisible({ timeout: 15000 });
    await fillSignInBtn.click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    await signOut(page);
  });
});
