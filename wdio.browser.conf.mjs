export const config = {
  runner: 'local',
  logLevel: 'error',
  specs: ['./e2e/browser/**/*.spec.mjs'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { timeout: 30_000 },
  services: [
    [
      '@wdio/tauri-service',
      {
        mode: 'browser',
        devServerUrl: 'http://localhost:1420',
        devServer: 'pnpm dev',
      },
    ],
  ],
  capabilities: [
    {
      browserName: 'tauri',
      'goog:chromeOptions': {
        args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
  ],
};
