import { runAllCleaners } from './cleanup';
import { log, rotateLogs } from './logger';

let isRunningCleanup = false;

async function runCleanup(trigger: string): Promise<void> {
  if (isRunningCleanup) return;
  isRunningCleanup = true;

  log('INFO', `Cleanup triggered by: ${trigger}`);

  try {
    rotateLogs(30);
    const summary = await runAllCleaners();
    const mb = (summary.totalBytesFreed / 1024 / 1024).toFixed(2);
    log('INFO', `Cleanup done — ${mb} MB freed.`);
  } catch (e) {
    log('ERROR', `Cleanup failed: ${(e as Error).message}`);
  }

  isRunningCleanup = false;
}

// On Windows, winsw (used by node-windows) force-kills the process with TerminateProcess
// during system shutdown, so SIGTERM is not reliably delivered. We run cleanup at startup
// instead to reliably clean up the previous session's temp files right after every reboot.
async function startup(): Promise<void> {
  log('INFO', 'PC Cleanup Service started — running startup cleanup...');
  await runCleanup('startup');
  log('INFO', 'Startup cleanup complete. Service is now idle.');
}

// Keep SIGTERM/SIGINT handlers as a bonus for manual service stops
process.on('SIGTERM', async () => {
  await runCleanup('SIGTERM');
  process.exit(0);
});
process.on('SIGINT', async () => {
  await runCleanup('SIGINT');
  process.exit(0);
});

// Run cleanup immediately on startup, then keep alive for signal-based triggers
startup().catch((e) => log('ERROR', `Startup failed: ${(e as Error).message}`));

// The interval keeps the Node.js event loop alive indefinitely
setInterval(() => { /* heartbeat */ }, 5 * 60 * 1000);
