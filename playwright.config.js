import { defineConfig } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve('./');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  use: {
    headless: false, // Extensions require headed mode
    viewport: { width: 1280, height: 720 },
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        launchOptions: {
          args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-sandbox',
          ],
        },
      },
    },
  ],
});
