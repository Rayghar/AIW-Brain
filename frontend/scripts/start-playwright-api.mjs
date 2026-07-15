import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../../backend/', import.meta.url));
process.chdir(backendRoot);
Object.assign(process.env, {
  PORT: '4100',
  HOST: '127.0.0.1',
  AIW_ALLOW_DEV_AUTH: 'true',
  AIW_RUNTIME_ACCEPTANCE_MODE: 'report',
});
for (const name of ['DATABASE_URL', 'MONGODB_URI', 'MONGO_URL']) delete process.env[name];

await import('../../backend/apps/api/dist/server.js');
