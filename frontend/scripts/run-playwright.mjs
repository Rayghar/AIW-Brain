import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const environment = { ...process.env };
const disableReasoningIndex = args.indexOf('--disable-llm-architecture-reasoning');
if (disableReasoningIndex >= 0) {
  args.splice(disableReasoningIndex, 1);
  environment.AIW_LLM_ARCHITECTURE_REASONING_ENABLED = 'false';
}

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('playwright')), 'cli.js');
const child = spawn(process.execPath, [cli, ...args], {
  env: environment,
  stdio: 'inherit',
  windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on('error', (error) => {
  console.error(`Unable to run Playwright: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
