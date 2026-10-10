const { chromium } = require('@playwright/test');

async function captureViewports() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [1920, 1366, 768, 390];

  for (const w of viewports) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    await page.goto('https://care-one.syam18official.workers.dev/staff/signin', { waitUntil: 'networkidle' });

    // Check header bounding box
    const header = page.locator('header');
    const headerBox = await header.boundingBox();
    console.log(`Viewport ${w}px - header box:`, headerBox);

    // Check if any element overflows the viewport horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Viewport ${w}px - document scrollWidth:`, scrollWidth, 'vs innerWidth:', w);

    await page.screenshot({ path: `docs/review/screenshots/live-staff-${w}px.png` });
    await page.close();
  }

  await browser.close();
}

captureViewports().catch(console.error);
