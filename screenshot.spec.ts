import { test, expect } from '@playwright/test';

test('take full page screenshot', async ({ page }) => {
  await page.goto('http://localhost:3003/');

  // Wait for animations
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verification/screenshots/fullpage2.png', fullPage: true });
});
