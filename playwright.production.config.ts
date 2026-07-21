import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PRODUCTION_BASE_URL

if (!baseURL) {
  throw new Error('PRODUCTION_BASE_URL is required for the production Three Endings smoke test.')
}

export default defineConfig({
  testDir: './tests/production',
  testMatch: 'production-three-endings-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: 'test-results/production-smoke/runtime',
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/production-smoke/results.json' }],
  ],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'production-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
