// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { formatSermonDate } from '../../src/lib/sermon-date';

// sermon_date es un día del calendario editorial (hora de Costa Rica) sin hora. BibliotecaClient lo pinta
// también en el navegador, así que el resultado no puede depender de la zona horaria de quien lo ejecuta.
const LARGA = { year: 'numeric', month: 'long', day: 'numeric' } as const;
const CORTA = { year: 'numeric', month: 'short' } as const;
const originalTz = process.env.TZ;
afterAll(() => { process.env.TZ = originalTz; });

describe('formatSermonDate', () => {
  it('la conversión con new Date() muestra el día anterior en Costa Rica (caso real de producción)', () => {
    process.env.TZ = 'America/Costa_Rica';
    expect(new Date('2026-10-11').toLocaleDateString('es-CR', LARGA)).toBe('10 de octubre de 2026');
  });

  for (const zone of ['America/Costa_Rica', 'UTC', 'Asia/Tokyo']) {
    it(`muestra el día editorial en ${zone}`, () => {
      process.env.TZ = zone;
      expect(formatSermonDate('2026-10-11', LARGA)).toBe('11 de octubre de 2026');
      expect(formatSermonDate('2026-10-03', LARGA)).toBe('3 de octubre de 2026');
      expect(formatSermonDate('2026-06-01', CORTA)).toBe('jun 2026');
      expect(formatSermonDate('2026-01-01', CORTA)).toBe('ene 2026');
    });
  }

  it('acepta el valor con hora que devuelve Directus para un campo date y usa solo el día', () => {
    process.env.TZ = 'America/Costa_Rica';
    expect(formatSermonDate('2026-10-11T00:00:00', LARGA)).toBe('11 de octubre de 2026');
  });
});
