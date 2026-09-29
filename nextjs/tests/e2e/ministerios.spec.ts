import { test, expect } from '@playwright/test';

// Regresión: el detalle de un ministerio devolvía 500 (DYNAMIC_SERVER_USAGE)
// porque la página se declaraba estática (revalidate + generateStaticParams)
// mientras el layout lee headers(). Ver commit 86b3ed1 (mismo caso en [slug]).

const LOCALES = ['es', 'en'] as const;
const MINISTERIO_ID = 1;

for (const locale of LOCALES) {
  test.describe(`Ministerios — ${locale}`, () => {
    test('la lista responde 200 con su encabezado', async ({ page }) => {
      const response = await page.goto(`/${locale}/ministerios`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test(`el detalle /${locale}/ministerios/${MINISTERIO_ID} responde 200 con el ministerio real`, async ({ page }) => {
      await page.goto(`/${locale}/ministerios`);
      const card = page.locator(`a[href="/${locale}/ministerios/${MINISTERIO_ID}"]`);
      test.skip(
        (await card.count()) === 0,
        `El ministerio ${MINISTERIO_ID} no está publicado en este entorno (Directus vacío en CI)`,
      );
      const expectedName = (await card.getByRole('heading', { level: 2 }).innerText()).trim();

      const response = await page.goto(`/${locale}/ministerios/${MINISTERIO_ID}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(expectedName);
      await expect(page.getByText('Internal Server Error')).toHaveCount(0);
    });

    test('el detalle del primer ministerio listado responde 200 con su nombre', async ({ page }) => {
      await page.goto(`/${locale}/ministerios`);
      const card = page.locator(`a[href^="/${locale}/ministerios/"]`).first();
      test.skip((await card.count()) === 0, 'No hay ministerios publicados en este entorno (Directus vacío en CI)');
      const href = await card.getAttribute('href');
      const expectedName = (await card.getByRole('heading', { level: 2 }).innerText()).trim();

      const response = await page.goto(href!);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(expectedName);
    });

    test('un ministerio inexistente responde 404, no 500', async ({ page }) => {
      const response = await page.goto(`/${locale}/ministerios/999999`);
      expect(response?.status()).toBe(404);
    });
  });
}
