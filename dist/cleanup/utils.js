"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDirectory = cleanDirectory;
exports.expandEnv = expandEnv;
exports.makeResult = makeResult;
exports.skippedResult = skippedResult;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Recursively deletes all contents of a directory (not the directory itself).
 * Returns bytes freed and files deleted.
 */
function cleanDirectory(dirPath, options = {}) {
    let bytes = 0;
    let files = 0;
    let dirs = 0;
    const errors = [];
    if (!fs_1.default.existsSync(dirPath)) {
        return { bytes, files, dirs, errors };
    }
    let entries;
    try {
        entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
    }
    catch (e) {
        errors.push(`Cannot read ${dirPath}: ${e.message}`);
        return { bytes, files, dirs, errors };
    }
    const cutoffMs = options.olderThanDays
        ? Date.now() - options.olderThanDays * 86400000
        : 0;
    for (const entry of entries) {
        const fullPath = path_1.default.join(dirPath, entry.name);
        try {
            if (entry.isDirectory()) {
                const result = cleanDirectory(fullPath, options);
                bytes += result.bytes;
                files += result.files;
                dirs += result.dirs;
                errors.push(...result.errors);
                try {
                    fs_1.default.rmdirSync(fullPath);
                    dirs++;
                }
                catch {
                    // Directory not empty (some files locked) — skip
                }
            }
            else {
                const stat = fs_1.default.statSync(fullPath);
                if (cutoffMs > 0 && stat.mtimeMs > cutoffMs)
                    continue; // too recent
                bytes += stat.size;
                fs_1.default.unlinkSync(fullPath);
                files++;
            }
        }
        catch (e) {
            errors.push(`${fullPath}: ${e.message}`);
        }
    }
    if (options.removeRoot) {
        try {
            fs_1.default.rmdirSync(dirPath);
            dirs++;
        }
        catch {
            // Not empty — leave it
        }
    }
    return { bytes, files, dirs, errors };
}
function expandEnv(p) {
    return p.replace(/%([^%]+)%/g, (_, key) => process.env[key] ?? `%${key}%`);
}
function makeResult(target, startTime, data) {
    return {
        target,
        bytesFreed: data.bytes,
        filesDeleted: data.files,
        directoriesRemoved: data.dirs,
        errors: data.errors,
        durationMs: Date.now() - startTime,
        skipped: false,
    };
}
function skippedResult(target, reason) {
    return {
        target,
        bytesFreed: 0,
        filesDeleted: 0,
        directoriesRemoved: 0,
        errors: [],
        durationMs: 0,
        skipped: true,
        skipReason: reason,
    };
}
//# sourceMappingURL=utils.js.map