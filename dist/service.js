"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cleanup_1 = require("./cleanup");
const logger_1 = require("./logger");
let isRunningCleanup = false;
async function runCleanup(trigger) {
    if (isRunningCleanup)
        return;
    isRunningCleanup = true;
    (0, logger_1.log)('INFO', `Cleanup triggered by: ${trigger}`);
    try {
        (0, logger_1.rotateLogs)(30);
        const summary = await (0, cleanup_1.runAllCleaners)();
        const mb = (summary.totalBytesFreed / 1024 / 1024).toFixed(2);
        (0, logger_1.log)('INFO', `Cleanup done — ${mb} MB freed.`);
    }
    catch (e) {
        (0, logger_1.log)('ERROR', `Cleanup failed: ${e.message}`);
    }
    isRunningCleanup = false;
}
// On Windows, winsw (used by node-windows) force-kills the process with TerminateProcess
// during system shutdown, so SIGTERM is not reliably delivered. We run cleanup at startup
// instead to reliably clean up the previous session's temp files right after every reboot.
async function startup() {
    (0, logger_1.log)('INFO', 'PC Cleanup Service started — running startup cleanup...');
    await runCleanup('startup');
    (0, logger_1.log)('INFO', 'Startup cleanup complete. Service is now idle.');
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
startup().catch((e) => (0, logger_1.log)('ERROR', `Startup failed: ${e.message}`));
// The interval keeps the Node.js event loop alive indefinitely
setInterval(() => { }, 5 * 60 * 1000);
//# sourceMappingURL=service.js.map