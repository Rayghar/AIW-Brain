import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const frontend = '../frontend';
if (!existsSync(frontend)) { console.error('Expected separated frontend folder at ../frontend'); process.exit(1); }
const result = spawnSync(process.execPath, ['scripts/verify-sprint8_9_21.mjs'], { cwd: frontend, stdio: 'inherit' });
process.exit(result.status ?? 1);
