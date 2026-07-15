import { preview } from 'vite';
import { fileURLToPath } from 'node:url';

const host = process.env.AIW_WEB_HOST ?? process.env.AIW_PERF_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.AIW_WEB_PORT ?? process.env.AIW_PERF_PORT ?? '4173', 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`Invalid Playwright web port: ${port}`);

await preview({
  root: fileURLToPath(new URL('../apps/web/', import.meta.url)),
  preview: {
    host,
    port,
    strictPort: true,
  },
});
