"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanBrowserCaches = cleanBrowserCaches;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const BROWSERS = [
    {
        name: 'Chrome',
        baseDir: '%LOCALAPPDATA%\\Google\\Chrome\\User Data',
        subdirs: ['Cache', 'Code Cache', 'GPUCache', 'Media Cache', 'ShaderCache'],
    },
    {
        name: 'Edge',
        baseDir: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data',
        subdirs: ['Cache', 'Code Cache', 'GPUCache', 'Media Cache', 'ShaderCache'],
    },
    {
        name: 'Brave',
        baseDir: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data',
        subdirs: ['Cache', 'Code Cache', 'GPUCache', 'Media Cache'],
    },
    {
        name: 'Opera',
        baseDir: '%APPDATA%\\Opera Software\\Opera Stable',
        subdirs: ['Cache', 'Code Cache', 'GPUCache'],
    },
    {
        name: 'Vivaldi',
        baseDir: '%LOCALAPPDATA%\\Vivaldi\\User Data',
        subdirs: ['Cache', 'Code Cache', 'GPUCache'],
    },
];
const FIREFOX_BASES = [
    '%APPDATA%\\Mozilla\\Firefox\\Profiles',
    '%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles',
];
const FIREFOX_CACHE_SUBDIRS = ['cache2', 'startupCache', 'thumbnails'];
function getChromiumResults(browser) {
    const results = [];
    const base = (0, utils_1.expandEnv)(browser.baseDir);
    if (!fs_1.default.existsSync(base))
        return results;
    // Collect profile directories (Default, Profile 1, Profile 2, ...)
    let profileDirs;
    try {
        profileDirs = fs_1.default
            .readdirSync(base)
            .filter((d) => d === 'Default' || /^Profile \d+$/.test(d))
            .map((d) => path_1.default.join(base, d));
    }
    catch {
        return results;
    }
    for (const profileDir of profileDirs) {
        for (const sub of browser.subdirs) {
            const target = path_1.default.join(profileDir, sub);
            if (!fs_1.default.existsSync(target))
                continue;
            const start = Date.now();
            const data = (0, utils_1.cleanDirectory)(target);
            results.push((0, utils_1.makeResult)(`${browser.name}/${path_1.default.basename(profileDir)}/${sub}`, start, data));
        }
    }
    return results;
}
function getFirefoxResults() {
    const results = [];
    for (const base of FIREFOX_BASES.map(utils_1.expandEnv)) {
        if (!fs_1.default.existsSync(base))
            continue;
        let profiles;
        try {
            profiles = fs_1.default.readdirSync(base).map((p) => path_1.default.join(base, p));
        }
        catch {
            continue;
        }
        for (const profileDir of profiles) {
            for (const sub of FIREFOX_CACHE_SUBDIRS) {
                const target = path_1.default.join(profileDir, sub);
                if (!fs_1.default.existsSync(target))
                    continue;
                const start = Date.now();
                const data = (0, utils_1.cleanDirectory)(target);
                results.push((0, utils_1.makeResult)(`Firefox/${path_1.default.basename(profileDir)}/${sub}`, start, data));
            }
        }
    }
    return results;
}
// Legacy Internet Explorer / Edge Legacy cache
function getIECacheResults() {
    const targets = [
        '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCache',
        '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCookies',
        '%LOCALAPPDATA%\\Microsoft\\Windows\\WebCache',
    ];
    return targets
        .map((raw) => {
        const resolved = (0, utils_1.expandEnv)(raw);
        if (!fs_1.default.existsSync(resolved))
            return (0, utils_1.skippedResult)(raw, 'Path not found');
        const start = Date.now();
        return (0, utils_1.makeResult)(raw, start, (0, utils_1.cleanDirectory)(resolved));
    })
        .filter((r) => !r.skipped);
}
async function cleanBrowserCaches() {
    const results = [];
    for (const browser of BROWSERS) {
        results.push(...getChromiumResults(browser));
    }
    results.push(...getFirefoxResults());
    results.push(...getIECacheResults());
    return results;
}
//# sourceMappingURL=browserCache.js.map