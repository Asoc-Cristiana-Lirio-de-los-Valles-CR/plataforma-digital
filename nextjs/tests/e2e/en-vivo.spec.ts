import { test, expect } from '@playwright/test';

for (const locale of ['es', 'en']) {
  test(`/${locale}/en-vivo responde y muestra su encabezado`, async ({ page }) => {
    const res = await page.goto(`/${locale}/en-vivo`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}
