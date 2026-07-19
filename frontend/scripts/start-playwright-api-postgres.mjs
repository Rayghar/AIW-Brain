import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const backendRoot = fileURLToPath(new URL('../../backend/', import.meta.url));
process.chdir(backendRoot);
loadEnvFile('.env');
Object.assign(process.env, {
  PORT: '4100',
  HOST: '127.0.0.1',
  AIW_ALLOW_DEV_AUTH: 'true',
  AIW_RUNTIME_ACCEPTANCE_MODE: 'report',
});
if (!process.env.DATABASE_URL?.trim()) throw new Error('RC10_78_2_POSTGRESQL_DATABASE_URL_MISSING');
await import('../../backend/apps/api/dist/server.js');
