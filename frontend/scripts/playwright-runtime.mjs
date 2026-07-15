import { accessSync, constants, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function resolveChromiumExecutablePath() {
  const configuredPath = process.env.AIW_CHROMIUM_PATH?.trim();
  if (!configuredPath) return undefined;

  const executablePath = resolve(configuredPath);
  try {
    if (!statSync(executablePath).isFile()) throw new Error('not a file');
    accessSync(executablePath, constants.X_OK);
  } catch {
    throw new Error(`AIW_CHROMIUM_PATH must name an existing executable file: ${executablePath}`);
  }
  return executablePath;
}

export function chromiumLaunchOptions() {
  const executablePath = resolveChromiumExecutablePath();
  const args = process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
  return {
    ...(executablePath ? { executablePath } : {}),
    ...(args.length ? { args } : {}),
  };
}
