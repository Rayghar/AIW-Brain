import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', timeout:30*60*1000, expect:{timeout:15000}, fullyParallel:false, workers:1, retries:0,
  outputDir:'./test-results/rc10-65-1-audit', reporter:[['list']],
  use:{locale:'en-GB',timezoneId:'Africa/Lagos',trace:'retain-on-failure',screenshot:'only-on-failure',video:'off',launchOptions:{executablePath:process.env.AIW_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}},
  projects:[{name:'chromium-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1600,height:900}}}],
  webServer:{command:"cd ../backend && env -u DATABASE_URL -u MONGODB_URI -u MONGO_URL PORT=4100 HOST=127.0.0.1 AIW_ALLOW_DEV_AUTH=true AIW_RUNTIME_ACCEPTANCE_MODE=report npm run start -w @aiw/api",url:'http://127.0.0.1:4100/health',reuseExistingServer:true,timeout:120000,stdout:'ignore',stderr:'pipe'}
});
