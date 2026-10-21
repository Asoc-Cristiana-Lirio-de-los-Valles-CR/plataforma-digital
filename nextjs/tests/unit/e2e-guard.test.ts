import { describe, it, expect } from 'vitest';
import { assertIsolatedE2E, assertIsolatedDirectusState, E2E_SENTINEL } from '../e2e/isolated/guard';

const isolated = {
  isolatedFlag: '1',
  directusUrl: 'http://localhost:8065',
  baseUrl: 'http://localhost:4100',
  redisUrl: 'redis://127.0.0.1:6390',
};

describe('assertIsolatedE2E', () => {
  it('acepta solo la configuración del stack aislado lirio-e2e', () => {
    expect(() => assertIsolatedE2E(isolated)).not.toThrow();
  });

  it('exige E2E_ISOLATED=1', () => {
    expect(() => assertIsolatedE2E({ ...isolated, isolatedFlag: undefined })).toThrow(/E2E_ISOLATED/);
  });

  it.each([
    ['directusUrl', 'https://api.liriodelosvallescr.org'],
    ['directusUrl', 'https://admin.liriodelosvallescr.org'],
    ['baseUrl', 'https://liriodelosvallescr.org'],
    ['baseUrl', 'https://liriodelosvalles.org'],
    ['directusUrl', 'http://20.12.207.240:8065'],
    ['directusUrl', 'http://directus:8065'],
  ])('rechaza destinos de producción o remotos (%s=%s)', (field, value) => {
    expect(() => assertIsolatedE2E({ ...isolated, [field]: value })).toThrow();
  });

  it.each([
    ['directusUrl', 'http://localhost:8055'],
    ['baseUrl', 'http://localhost:4000'],
    ['baseUrl', 'http://localhost:3000'],
    ['redisUrl', 'redis://localhost:6379'],
  ])('rechaza los puertos del stack de desarrollo (%s=%s)', (field, value) => {
    expect(() => assertIsolatedE2E({ ...isolated, [field]: value })).toThrow();
  });
});

describe('assertIsolatedDirectusState', () => {
  it('acepta un Directus vacío (recién creado) o ya marcado con el centinela', () => {
    expect(() => assertIsolatedDirectusState({ projectName: 'Directus', sermonCount: 0 })).not.toThrow();
    expect(() => assertIsolatedDirectusState({ projectName: E2E_SENTINEL, sermonCount: 12 })).not.toThrow();
  });

  it('rechaza un Directus con sermones que no lleva el centinela', () => {
    expect(() => assertIsolatedDirectusState({ projectName: 'Lirio de los Valles', sermonCount: 1027 })).toThrow(/centinela/);
  });
});
