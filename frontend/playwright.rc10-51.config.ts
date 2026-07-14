import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  webServer: undefined,
  reporter: [['line']],
  outputDir: './test-results/rc10-51',
});
