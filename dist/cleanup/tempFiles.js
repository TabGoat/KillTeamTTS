"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTempFiles = cleanTempFiles;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const TEMP_TARGETS = [
    '%TEMP%',
    '%TMP%',
    '%LOCALAPPDATA%\\Temp',
    'C:\\Windows\\Temp',
];
async function cleanTempFiles() {
    const results = [];
    const seen = new Set();
    for (const raw of TEMP_TARGETS) {
        const resolved = path_1.default.resolve((0, utils_1.expandEnv)(raw));
        if (seen.has(resolved))
            continue; // deduplicate (TEMP and TMP often point to the same dir)
        seen.add(resolved);
        const start = Date.now();
        const data = (0, utils_1.cleanDirectory)(resolved);
        results.push((0, utils_1.makeResult)(raw, start, data));
    }
    return results;
}
//# sourceMappingURL=tempFiles.js.map