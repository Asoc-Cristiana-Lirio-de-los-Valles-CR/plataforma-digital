import { test, expect } from '@playwright/test';

test('redirects to /es/ by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/es(\/|$)/);
});

test('shows language toggle in header', async ({ page }) => {
  await page.goto('/es/');
  const toggle = page.getByRole('button', { name: /switch to english|cambiar a español/i });
  await expect(toggle).toBeVisible();
});

test('switching to english changes URL', async ({ page }) => {
  await page.goto('/es/');
  await page.getByRole('button', { name: /switch to english/i }).click();
  await expect(page).toHaveURL(/\/en(\/|$)/);
});

test('switching back to spanish works', async ({ page }) => {
  await page.goto('/en/');
  await page.getByRole('button', { name: /cambiar a español/i }).click();
  await expect(page).toHaveURL(/\/es(\/|$)/);
});
