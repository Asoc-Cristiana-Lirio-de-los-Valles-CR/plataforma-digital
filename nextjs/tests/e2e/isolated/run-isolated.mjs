// Ejecuta la suite E2E completa contra un stack lirio-e2e recién creado y lo destruye al terminar.
// Uso: npm run test:e2e:isolated [-- <argumentos de playwright>]   (E2E_KEEP_STACK=1 para conservarlo)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const nextjsDir = path.resolve(here, '../../..');
const composeFile = path.resolve(nextjsDir, '..', 'docker-compose.e2e.yml');
const compose = ['compose', '-f', composeFile];

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts }).status ?? 1;

const env = {
  ...process.env,
  E2E_ISOLATED: '1',
  BASE_URL: 'http://localhost:4100',
  E2E_DIRECTUS_URL: 'http://localhost:8065',
  E2E_REDIS_URL: 'redis://127.0.0.1:6390',
};

run('docker', [...compose, 'down', '-v']);
if (run('docker', [...compose, 'up', '-d', '--build', '--wait']) !== 0) {
  run('docker', [...compose, 'logs', '--tail', '80']);
  process.exit(1);
}
const status = run('npx', ['playwright', 'test', ...process.argv.slice(2)], { cwd: nextjsDir, env });
if (!process.env.E2E_KEEP_STACK) run('docker', [...compose, 'down', '-v']);
process.exit(status);
