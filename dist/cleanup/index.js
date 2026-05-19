"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllCleaners = runAllCleaners;
const tempFiles_1 = require("./tempFiles");
const browserCache_1 = require("./browserCache");
const windowsSystem_1 = require("./windowsSystem");
const recycleBin_1 = require("./recycleBin");
const logger_1 = require("../logger");
async function runAllCleaners() {
    const startedAt = new Date();
    (0, logger_1.log)('INFO', '=== Cleanup started ===');
    // Run all cleaner groups in parallel for maximum speed
    const [tempResults, browserResults, systemResults, recycleBinResult, networkResults] = await Promise.all([
        (0, tempFiles_1.cleanTempFiles)().catch((e) => errorResult('Temp Files', e)),
        (0, browserCache_1.cleanBrowserCaches)().catch((e) => errorResult('Browser Caches', e)),
        (0, windowsSystem_1.cleanWindowsSystem)().catch((e) => errorResult('Windows System', e)),
        (0, recycleBin_1.cleanRecycleBin)().catch((e) => errorResultSingle('Recycle Bin', e)),
        (0, recycleBin_1.cleanNetwork)().catch((e) => errorResult('Network', e)),
    ]);
    const results = [
        ...tempResults,
        ...browserResults,
        ...systemResults,
        recycleBinResult,
        ...networkResults,
    ];
    const finishedAt = new Date();
    const totalBytesFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);
    const totalFilesDeleted = results.reduce((sum, r) => sum + r.filesDeleted, 0);
    const summary = {
        startedAt,
        finishedAt,
        totalBytesFreed,
        totalFilesDeleted,
        results,
    };
    logSummary(summary);
    return summary;
}
function logSummary(summary) {
    const durationSec = ((summary.finishedAt.getTime() - summary.startedAt.getTime()) / 1000).toFixed(1);
    const mbFreed = (summary.totalBytesFreed / 1024 / 1024).toFixed(2);
    (0, logger_1.log)('INFO', `=== Cleanup complete in ${durationSec}s ===`);
    (0, logger_1.log)('INFO', `Total freed: ${mbFreed} MB across ${summary.totalFilesDeleted} files`);
    for (const r of summary.results) {
        if (r.skipped) {
            (0, logger_1.log)('DEBUG', `  SKIP  ${r.target}: ${r.skipReason}`);
            continue;
        }
        const mb = (r.bytesFreed / 1024 / 1024).toFixed(2);
        const status = r.errors.length > 0 ? 'WARN ' : 'OK   ';
        (0, logger_1.log)('INFO', `  ${status} ${r.target}: ${mb} MB, ${r.filesDeleted} files (${r.durationMs}ms)`);
        for (const err of r.errors.slice(0, 3)) {
            (0, logger_1.log)('WARN', `         ↳ ${err}`);
        }
        if (r.errors.length > 3) {
            (0, logger_1.log)('WARN', `         ↳ ...and ${r.errors.length - 3} more errors`);
        }
    }
}
function errorResult(label, e) {
    return [
        {
            target: label,
            bytesFreed: 0,
            filesDeleted: 0,
            directoriesRemoved: 0,
            errors: [e.message],
            durationMs: 0,
            skipped: false,
        },
    ];
}
function errorResultSingle(label, e) {
    return {
        target: label,
        bytesFreed: 0,
        filesDeleted: 0,
        directoriesRemoved: 0,
        errors: [e.message],
        durationMs: 0,
        skipped: false,
    };
}
//# sourceMappingURL=index.js.map