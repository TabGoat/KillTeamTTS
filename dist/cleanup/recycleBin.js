"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanRecycleBin = cleanRecycleBin;
exports.cleanNetwork = cleanNetwork;
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
async function cleanRecycleBin() {
    const label = 'Recycle Bin';
    const start = Date.now();
    const errors = [];
    try {
        // PowerShell's Clear-RecycleBin is the cleanest way to do this on Windows
        (0, child_process_1.execSync)('powershell.exe -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', {
            timeout: 30000,
        });
    }
    catch (e) {
        errors.push(e.message);
    }
    return (0, utils_1.makeResult)(label, start, { bytes: 0, files: 0, dirs: 0, errors });
}
async function cleanNetwork() {
    const results = [];
    const commands = [
        { label: 'DNS Cache', cmd: 'ipconfig /flushdns' },
        { label: 'ARP Cache', cmd: 'arp -d *' },
        { label: 'NetBIOS Cache', cmd: 'nbtstat -R' },
        { label: 'Winsock Catalog', cmd: 'netsh winsock reset' },
    ];
    for (const { label, cmd } of commands) {
        const start = Date.now();
        const errors = [];
        try {
            (0, child_process_1.execSync)(cmd, { timeout: 10000, stdio: 'ignore' });
        }
        catch (e) {
            errors.push(e.message);
        }
        results.push((0, utils_1.makeResult)(label, start, { bytes: 0, files: 0, dirs: 0, errors }));
    }
    return results;
}
//# sourceMappingURL=recycleBin.js.map