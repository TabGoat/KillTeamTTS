"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.rotateLogs = rotateLogs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = path_1.default.resolve(__dirname, '..', 'logs');
function getLogPath() {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return path_1.default.join(LOG_DIR, `cleanup-${date}.log`);
}
function ensureLogDir() {
    if (!fs_1.default.existsSync(LOG_DIR)) {
        fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
    }
}
function log(level, message) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${message}`;
    console.log(line);
    try {
        ensureLogDir();
        fs_1.default.appendFileSync(getLogPath(), line + '\n');
    }
    catch {
        // If logging fails, don't crash the service
    }
}
/** Rotate logs older than retainDays */
function rotateLogs(retainDays = 30) {
    if (!fs_1.default.existsSync(LOG_DIR))
        return;
    const cutoff = Date.now() - retainDays * 86400000;
    try {
        for (const file of fs_1.default.readdirSync(LOG_DIR)) {
            const full = path_1.default.join(LOG_DIR, file);
            const stat = fs_1.default.statSync(full);
            if (stat.mtimeMs < cutoff) {
                fs_1.default.unlinkSync(full);
                log('INFO', `Rotated old log: ${file}`);
            }
        }
    }
    catch {
        // Non-fatal
    }
}
//# sourceMappingURL=logger.js.map