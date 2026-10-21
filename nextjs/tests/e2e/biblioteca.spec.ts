import { test, expect } from '@playwright/test';

test.describe('Biblioteca Digital — página principal', () => {
  test('página biblioteca carga con heading y buscador', async ({ page }) => {
    await page.goto('/es/biblioteca');
    // Esperar que cargue el contenido (puede ser lento si Directus no tiene datos)
    await page.waitForLoadState('networkidle');
    // El h1 debe existir con texto de la biblioteca
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    // El input de búsqueda debe existir
    const searchInput = page.getByRole('searchbox');
    await expect(searchInput).toBeVisible();
  });

  test('buscador acepta input del usuario', async ({ page }) => {
    await page.goto('/es/biblioteca');
    await page.waitForLoadState('networkidle');
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('Romanos');
    await expect(searchInput).toHaveValue('Romanos');
  });

  test('página biblioteca en inglés carga', async ({ page }) => {
    await page.goto('/en/biblioteca');
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});

test.describe('Biblioteca Digital — página individual', () => {
  test('slug inexistente retorna 404', async ({ page }) => {
    const response = await page.goto('/es/biblioteca/predicacion-que-no-existe-xyz123');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Biblioteca Digital — API sync', () => {
  test('POST sin token retorna 401', async ({ request }) => {
    const res = await request.post('/api/sync/youtube');
    expect(res.status()).toBe(401);
  });

  test('POST con token incorrecto retorna 401', async ({ request }) => {
    const res = await request.post('/api/sync/youtube', {
      headers: { Authorization: 'Bearer token-completamente-incorrecto-xyz' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Biblioteca Digital — serie y predicador', () => {
  test('serie inexistente retorna 404', async ({ page }) => {
    const response = await page.goto('/es/biblioteca/series/serie-que-no-existe-xyz');
    expect(response?.status()).toBe(404);
  });

  test('predicador inexistente retorna 404', async ({ page }) => {
    const response = await page.goto('/es/biblioteca/predicador/predicador-que-no-existe-xyz');
    expect(response?.status()).toBe(404);
  });
});
