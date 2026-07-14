import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import type { Page, Route } from '@playwright/test';

const distRoot = resolve(process.cwd(), 'apps/web/dist');
const apiOrigin = process.env.AIW_E2E_API_ORIGIN ?? 'http://127.0.0.1:4100';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safeStaticPath(pathname: string): string {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\/+/, ''));
  const candidate = resolve(distRoot, relative);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) throw new Error('Unsafe static path');
  return candidate;
}

async function proxyApi(route: Route, url: URL) {
  const request = route.request();
  const target = `${apiOrigin}${url.pathname}${url.search}`;
  const headers = { ...request.headers() };
  delete headers.host;
  delete headers['content-length'];
  const response = await fetch(target, {
    method: request.method(),
    headers,
    body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postDataBuffer() ?? undefined,
    redirect: 'manual',
  });
  const body = Buffer.from(await response.arrayBuffer());
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) responseHeaders[key] = value;
  });
  await route.fulfill({ status: response.status, headers: responseHeaders, body });
}

export async function mountAiw(page: Page, options: { clearStorage?: boolean; initialStorage?: Record<string, string> } = {}) {
  const clearStorage = options.clearStorage ?? true;
  const initialStorage = options.initialStorage ?? {};
  await page.route('https://aiw.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/health' || url.pathname.startsWith('/api/')) {
      await proxyApi(route, url);
      return;
    }
    try {
      const filePath = safeStaticPath(url.pathname);
      const body = await readFile(filePath);
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        },
        body,
      });
    } catch {
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' });
    }
  });

  await page.evaluate(({ clearStorage, initialStorage }) => {
    if (!crypto.randomUUID) {
      Object.defineProperty(crypto, 'randomUUID', {
        value: () => `00000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12)}`,
        configurable: true,
      });
    }
    const createStorage = () => {
      const data = new Map<string, string>();
      return {
        getItem: (key: string) => data.has(String(key)) ? data.get(String(key)) ?? null : null,
        setItem: (key: string, value: string) => data.set(String(key), String(value)),
        removeItem: (key: string) => data.delete(String(key)),
        clear: () => data.clear(),
        key: (index: number) => [...data.keys()][index] ?? null,
        get length() { return data.size; },
      };
    };
    const local = createStorage();
    const session = createStorage();
    Object.defineProperty(window, 'localStorage', { value: local, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: session, configurable: true });
    if (clearStorage) {
      local.clear();
      session.clear();
    }
    for (const [key, value] of Object.entries(initialStorage)) local.setItem(key, value);
  }, { clearStorage, initialStorage });

  let html = await readFile(resolve(distRoot, 'index.html'), 'utf8');
  html = html.replace('<head>', '<head><base href="https://aiw.test/">');
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForLoadState('domcontentloaded');
}
