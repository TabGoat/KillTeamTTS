/**
 * Removes the PC Cleanup Agent Windows Service.
 * Must be run as Administrator:
 *   node uninstall.js
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'PC Cleanup Agent',
  script: path.join(__dirname, 'dist', 'service.js'),
});

svc.on('uninstall', () => {
  console.log('✅  Service uninstalled successfully.');
});

svc.on('error', (err) => {
  console.error('❌  Error:', err.message);
});

svc.on('invalidinstallation', () => {
  console.log('ℹ️   Service was not installed.');
});

console.log('Removing PC Cleanup Agent service...');
svc.uninstall();
