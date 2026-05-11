import { test, expect } from '@playwright/test';

test('navigation links visible on homepage', async ({ page }) => {
  await page.goto('/es/');
  await expect(page.getByRole('link', { name: /inicio/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /historia/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /en vivo/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /donar/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /contacto/i })).toBeVisible();
});

test('dark mode toggle switches theme', async ({ page }) => {
  await page.goto('/es/');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: /cambiar a modo oscuro/i });
  await toggle.click();
  await expect(html).toHaveClass(/dark/);
});

test('dark mode persists after page reload', async ({ page }) => {
  await page.goto('/es/');
  await page.getByRole('button', { name: /cambiar a modo oscuro/i }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
