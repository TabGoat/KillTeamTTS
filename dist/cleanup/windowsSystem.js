"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanWindowsSystem = cleanWindowsSystem;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
// Windows Update download cache (safe to delete — re-downloaded on demand)
const WINDOWS_UPDATE_CACHE = 'C:\\Windows\\SoftwareDistribution\\Download';
// Delivery Optimization cache (Windows Update P2P cache)
const DELIVERY_OPTIMIZATION = 'C:\\Windows\\SoftwareDistribution\\DeliveryOptimization';
// Windows Error Reporting files
const WER_PATHS = [
    '%LOCALAPPDATA%\\Microsoft\\Windows\\WER',
    'C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive',
    'C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue',
];
// Thumbnail cache files (Explorer rebuilds them automatically)
const THUMBNAIL_CACHE_DIR = '%LOCALAPPDATA%\\Microsoft\\Windows\\Explorer';
const THUMBNAIL_PATTERN = /^(thumbcache_|iconcache_)/i;
// Crash / memory dumps
const DUMP_TARGETS = [
    'C:\\Windows\\Minidump',
    'C:\\Windows\\LiveKernelReports',
    '%LOCALAPPDATA%\\CrashDumps',
];
const MEMORY_DUMP = 'C:\\Windows\\MEMORY.DMP';
// CBS (Component-Based Servicing) logs — can be several hundred MB
const CBS_LOG = 'C:\\Windows\\Logs\\CBS';
// Windows.old — leftover from OS upgrade, can be several GB
const WINDOWS_OLD = 'C:\\Windows.old';
function cleanThumbnailCache() {
    const dir = (0, utils_1.expandEnv)(THUMBNAIL_CACHE_DIR);
    const label = 'Thumbnail/Icon Cache';
    if (!fs_1.default.existsSync(dir))
        return (0, utils_1.skippedResult)(label, 'Path not found');
    let bytes = 0;
    let files = 0;
    const errors = [];
    const start = Date.now();
    try {
        for (const entry of fs_1.default.readdirSync(dir)) {
            if (!THUMBNAIL_PATTERN.test(entry))
                continue;
            const full = path_1.default.join(dir, entry);
            try {
                const stat = fs_1.default.statSync(full);
                fs_1.default.unlinkSync(full);
                bytes += stat.size;
                files++;
            }
            catch (e) {
                errors.push(`${full}: ${e.message}`);
            }
        }
    }
    catch (e) {
        errors.push(`Cannot read ${dir}: ${e.message}`);
    }
    return (0, utils_1.makeResult)(label, start, { bytes, files, dirs: 0, errors });
}
function cleanMemoryDump() {
    const label = 'Memory Dump (MEMORY.DMP)';
    const start = Date.now();
    if (!fs_1.default.existsSync(MEMORY_DUMP))
        return (0, utils_1.skippedResult)(label, 'File not found');
    try {
        const stat = fs_1.default.statSync(MEMORY_DUMP);
        fs_1.default.unlinkSync(MEMORY_DUMP);
        return (0, utils_1.makeResult)(label, start, { bytes: stat.size, files: 1, dirs: 0, errors: [] });
    }
    catch (e) {
        return (0, utils_1.makeResult)(label, start, { bytes: 0, files: 0, dirs: 0, errors: [e.message] });
    }
}
async function cleanWindowsSystem() {
    const results = [];
    // Windows Update download cache
    if (fs_1.default.existsSync(WINDOWS_UPDATE_CACHE)) {
        const start = Date.now();
        results.push((0, utils_1.makeResult)('Windows Update Cache', start, (0, utils_1.cleanDirectory)(WINDOWS_UPDATE_CACHE)));
    }
    // Delivery Optimization
    if (fs_1.default.existsSync(DELIVERY_OPTIMIZATION)) {
        const start = Date.now();
        results.push((0, utils_1.makeResult)('Delivery Optimization Cache', start, (0, utils_1.cleanDirectory)(DELIVERY_OPTIMIZATION)));
    }
    // WER
    for (const raw of WER_PATHS) {
        const resolved = (0, utils_1.expandEnv)(raw);
        if (!fs_1.default.existsSync(resolved))
            continue;
        const start = Date.now();
        results.push((0, utils_1.makeResult)(`WER: ${raw}`, start, (0, utils_1.cleanDirectory)(resolved)));
    }
    // Thumbnail / icon cache
    results.push(cleanThumbnailCache());
    // Crash dumps
    for (const raw of DUMP_TARGETS) {
        const resolved = (0, utils_1.expandEnv)(raw);
        if (!fs_1.default.existsSync(resolved))
            continue;
        const start = Date.now();
        results.push((0, utils_1.makeResult)(`Crash Dumps: ${raw}`, start, (0, utils_1.cleanDirectory)(resolved)));
    }
    // Memory dump
    results.push(cleanMemoryDump());
    // CBS logs
    if (fs_1.default.existsSync(CBS_LOG)) {
        const start = Date.now();
        results.push((0, utils_1.makeResult)('CBS Logs', start, (0, utils_1.cleanDirectory)(CBS_LOG)));
    }
    // Windows.old — only if exists (post-upgrade remnant)
    if (fs_1.default.existsSync(WINDOWS_OLD)) {
        const start = Date.now();
        results.push((0, utils_1.makeResult)('Windows.old', start, (0, utils_1.cleanDirectory)(WINDOWS_OLD, { removeRoot: false })));
    }
    return results;
}
//# sourceMappingURL=windowsSystem.js.map