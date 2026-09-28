export const config = {
  runner: 'local',
  logLevel: 'error',
  specs: ['./e2e/native/**/*.spec.mjs'],
  maxInstances: 1,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { timeout: 30_000 },
  services: [
    [
      '@wdio/tauri-service',
      {
        appBinaryPath: './apps/desktop/src-tauri/target/debug/print-studio.exe',
        driverProvider: 'external',
        autoInstallTauriDriver: true,
      },
    ],
  ],
  capabilities: [{ browserName: 'tauri' }],
};
