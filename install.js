/**
 * Registers the cleanup agent as a Windows Service.
 * Must be run as Administrator:
 *   node install.js
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'PC Cleanup Agent',
  description: 'Runs a thorough system cleanup (temp files, caches, dumps) on every shutdown.',
  script: path.join(__dirname, 'dist', 'service.js'),
  nodeOptions: [],
  // Give the cleanup up to 60 seconds before Windows forces a kill
  stopTimeout: 60_000,
  // Run as LocalSystem so it can reach system directories (Windows\Temp, SoftwareDistribution, etc.)
  // If you prefer a user account, set: user: { account: 'YourPC\\YourUser', password: '...' }
});

svc.on('install', () => {
  console.log('✅  Service installed — starting...');
  svc.start();
});

svc.on('start', () => {
  console.log('✅  Service started. It will run cleanup automatically on every shutdown.');
  console.log('    Logs are written to: ' + path.join(__dirname, 'logs'));
});

svc.on('error', (err) => {
  console.error('❌  Service error:', err.message);
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ️   Service is already installed. Run "node uninstall.js" first to reinstall.');
});

console.log('Installing PC Cleanup Agent as a Windows Service...');
svc.install();
