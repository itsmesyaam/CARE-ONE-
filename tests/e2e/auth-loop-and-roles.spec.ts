import { test, expect } from '@playwright/test';

test.describe('End-to-End: Authentication, Roles, Reload Persistence & No-Loop Invariants', () => {
  const PASSWORD = 'DemoPassword123!';

  test('fresh incognito visit to "/" has NO signed-out banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=You\'ve been signed out')).not.toBeVisible();
    await expect(page.locator('text=നിങ്ങൾ സൈൻ ഔട്ട് ചെയ്യപ്പെട്ടു')).not.toBeVisible();
  });

  test('/patient/login stays open for 10 seconds without bouncing to / and shows demo buttons', async ({ page }) => {
    await page.goto('/patient/login');
    // Verify on /patient/login
    expect(page.url()).toContain('/patient/login');

    // Verify Demo accounts card is rendered
    await expect(page.locator('text=Demo Accounts')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Arun Kumar")')).toBeVisible();
    await expect(page.locator('button:has-text("Sujatha Nair")')).toBeVisible();

    // Wait 10 seconds and verify still on /patient/login
    await page.waitForTimeout(10000);
    expect(page.url()).toContain('/patient/login');
    await expect(page.locator('#username')).toBeVisible();
  });

  test('/staff/signin stays open for 10 seconds without bouncing to /', async ({ page }) => {
    await page.goto('/staff/signin');
    expect(page.url()).toContain('/staff/signin');
    await expect(page.locator('#username')).toBeVisible();

    await page.waitForTimeout(10000);
    expect(page.url()).toContain('/staff/signin');
  });

  test('dr.rahul@example.com signs in, lands on /doctor, and stays on /doctor after reload', async ({ page }) => {
    await page.goto('/staff/signin');

    await page.fill('#username', 'dr.rahul@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    // Lands on /doctor
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });
    await expect(page.locator('body')).not.toContainText(/Home Page/i);

    // Stays after page reload (proves no session-check loop back to /)
    await page.reload();
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });
  });

  test('desk@example.com signs in and lands on /doctor (desk view)', async ({ page }) => {
    await page.goto('/staff/signin');

    await page.fill('#username', 'desk@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });
  });

  test('admin@example.com signs in and lands on /admin', async ({ page }) => {
    await page.goto('/staff/signin');

    await page.fill('#username', 'admin@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test('ABC-1001 (Arun) signs in, lands on /patient, and stays on /patient after reload', async ({ page }) => {
    await page.goto('/patient/login');

    await page.fill('#username', 'ABC-1001');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/patient/, { timeout: 15000 });
    await expect(page.locator('body')).not.toContainText(/Sign in/i);

    // Stays after page reload
    await page.reload();
    await expect(page).toHaveURL(/\/patient/, { timeout: 15000 });
  });

  test('ABC-1002 (Sujatha) signs in, lands on /patient, and can switch to Baby Meenakshi', async ({ page }) => {
    await page.goto('/patient/login');

    await page.fill('#username', 'ABC-1002');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/patient/, { timeout: 15000 });

    // Open profile switcher
    const switchProfileBtn = page.locator('button[aria-label="Switch profile"]').first();
    await expect(switchProfileBtn).toBeVisible({ timeout: 10000 });
    await switchProfileBtn.click();

    // Modal dialog opens
    const dialog = page.locator('div[role="dialog"][aria-label="Switch profile"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog lists real API profiles and not mock data
    await expect(dialog.locator('text=Sujatha Nair')).toBeVisible();
    await expect(dialog.locator('text=Baby Meenakshi')).toBeVisible();
    await expect(dialog.locator('text=Anjali Menon')).not.toBeVisible();
    await expect(dialog.locator('text=Aarav Menon')).not.toBeVisible();

    // Click Baby Meenakshi
    const meenakshiBtn = dialog.locator('button:has-text("Meenakshi")');
    await expect(meenakshiBtn).toBeVisible();
    await meenakshiBtn.click();

    // Verify switched
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('body')).toContainText(/Meenakshi/i);
  });

  test('wrong password shows error message, stays on login page, and does not loop to /', async ({ page }) => {
    await page.goto('/staff/signin');

    await page.fill('#username', 'dr.rahul@example.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Error message is displayed
    const errorAlert = page.locator('.bg-rose-50, [role="alert"]').filter({ hasText: /Invalid username or password/i }).first();
    await expect(errorAlert).toBeVisible({ timeout: 10000 });

    // URL remains on /staff/signin
    expect(page.url()).toContain('/staff/signin');
  });

  test('logout navigates to "/" and browser Back does not reveal patient data', async ({ page }) => {
    // 1. Sign in as Dr. Rahul
    await page.goto('/staff/signin');
    await page.fill('#username', 'dr.rahul@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/doctor/, { timeout: 15000 });

    // 2. Click Sign Out
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Sign out"), button[aria-label="Sign out"]').first();
    await expect(signOutBtn).toBeVisible({ timeout: 10000 });
    await signOutBtn.click();

    // 3. Lands on /
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // 4. Press Back button
    await page.goBack();

    // 5. Back does not show clinical doctor dashboard or patient data
    await expect(page).not.toHaveURL(/\/doctor/);
    await expect(page.locator('body')).not.toContainText(/Consultation Notes|Clinical Timeline/i);
  });
});
