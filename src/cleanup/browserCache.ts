import path from 'path';
import fs from 'fs';
import type { CleanResult } from './types';
import { cleanDirectory, expandEnv, makeResult, skippedResult } from './utils';

interface BrowserProfile {
  name: string;
  baseDir: string;
  subdirs: string[]; // relative to each profile directory
}

const BROWSERS: BrowserProfile[] = [
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

function getChromiumResults(browser: BrowserProfile): CleanResult[] {
  const results: CleanResult[] = [];
  const base = expandEnv(browser.baseDir);
  if (!fs.existsSync(base)) return results;

  // Collect profile directories (Default, Profile 1, Profile 2, ...)
  let profileDirs: string[];
  try {
    profileDirs = fs
      .readdirSync(base)
      .filter((d: string) => d === 'Default' || /^Profile \d+$/.test(d))
      .map((d: string) => path.join(base, d));
  } catch {
    return results;
  }

  for (const profileDir of profileDirs) {
    for (const sub of browser.subdirs) {
      const target = path.join(profileDir, sub);
      if (!fs.existsSync(target)) continue;
      const start = Date.now();
      const data = cleanDirectory(target);
      results.push(makeResult(`${browser.name}/${path.basename(profileDir)}/${sub}`, start, data));
    }
  }

  return results;
}

function getFirefoxResults(): CleanResult[] {
  const results: CleanResult[] = [];

  for (const base of FIREFOX_BASES.map(expandEnv)) {
    if (!fs.existsSync(base)) continue;

    let profiles: string[];
    try {
      profiles = fs.readdirSync(base).map((p: string) => path.join(base, p));
    } catch {
      continue;
    }

    for (const profileDir of profiles) {
      for (const sub of FIREFOX_CACHE_SUBDIRS) {
        const target = path.join(profileDir, sub);
        if (!fs.existsSync(target)) continue;
        const start = Date.now();
        const data = cleanDirectory(target);
        results.push(makeResult(`Firefox/${path.basename(profileDir)}/${sub}`, start, data));
      }
    }
  }

  return results;
}

// Legacy Internet Explorer / Edge Legacy cache
function getIECacheResults(): CleanResult[] {
  const targets = [
    '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCache',
    '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCookies',
    '%LOCALAPPDATA%\\Microsoft\\Windows\\WebCache',
  ];

  return targets
    .map((raw) => {
      const resolved = expandEnv(raw);
      if (!fs.existsSync(resolved)) return skippedResult(raw, 'Path not found');
      const start = Date.now();
      return makeResult(raw, start, cleanDirectory(resolved));
    })
    .filter((r) => !r.skipped);
}

export async function cleanBrowserCaches(): Promise<CleanResult[]> {
  const results: CleanResult[] = [];

  for (const browser of BROWSERS) {
    results.push(...getChromiumResults(browser));
  }

  results.push(...getFirefoxResults());
  results.push(...getIECacheResults());

  return results;
}
