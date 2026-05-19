import fs from 'fs';
import path from 'path';
import type { CleanResult } from './types';
import { cleanDirectory, expandEnv, makeResult, skippedResult } from './utils';

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

function cleanThumbnailCache(): CleanResult {
  const dir = expandEnv(THUMBNAIL_CACHE_DIR);
  const label = 'Thumbnail/Icon Cache';
  if (!fs.existsSync(dir)) return skippedResult(label, 'Path not found');

  let bytes = 0;
  let files = 0;
  const errors: string[] = [];
  const start = Date.now();

  try {
    for (const entry of fs.readdirSync(dir)) {
      if (!THUMBNAIL_PATTERN.test(entry)) continue;
      const full = path.join(dir, entry);
      try {
        const stat = fs.statSync(full);
        fs.unlinkSync(full);
        bytes += stat.size;
        files++;
      } catch (e) {
        errors.push(`${full}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    errors.push(`Cannot read ${dir}: ${(e as Error).message}`);
  }

  return makeResult(label, start, { bytes, files, dirs: 0, errors });
}

function cleanMemoryDump(): CleanResult {
  const label = 'Memory Dump (MEMORY.DMP)';
  const start = Date.now();
  if (!fs.existsSync(MEMORY_DUMP)) return skippedResult(label, 'File not found');
  try {
    const stat = fs.statSync(MEMORY_DUMP);
    fs.unlinkSync(MEMORY_DUMP);
    return makeResult(label, start, { bytes: stat.size, files: 1, dirs: 0, errors: [] });
  } catch (e) {
    return makeResult(label, start, { bytes: 0, files: 0, dirs: 0, errors: [(e as Error).message] });
  }
}

export async function cleanWindowsSystem(): Promise<CleanResult[]> {
  const results: CleanResult[] = [];

  // Windows Update download cache
  if (fs.existsSync(WINDOWS_UPDATE_CACHE)) {
    const start = Date.now();
    results.push(makeResult('Windows Update Cache', start, cleanDirectory(WINDOWS_UPDATE_CACHE)));
  }

  // Delivery Optimization
  if (fs.existsSync(DELIVERY_OPTIMIZATION)) {
    const start = Date.now();
    results.push(makeResult('Delivery Optimization Cache', start, cleanDirectory(DELIVERY_OPTIMIZATION)));
  }

  // WER
  for (const raw of WER_PATHS) {
    const resolved = expandEnv(raw);
    if (!fs.existsSync(resolved)) continue;
    const start = Date.now();
    results.push(makeResult(`WER: ${raw}`, start, cleanDirectory(resolved)));
  }

  // Thumbnail / icon cache
  results.push(cleanThumbnailCache());

  // Crash dumps
  for (const raw of DUMP_TARGETS) {
    const resolved = expandEnv(raw);
    if (!fs.existsSync(resolved)) continue;
    const start = Date.now();
    results.push(makeResult(`Crash Dumps: ${raw}`, start, cleanDirectory(resolved)));
  }

  // Memory dump
  results.push(cleanMemoryDump());

  // CBS logs
  if (fs.existsSync(CBS_LOG)) {
    const start = Date.now();
    results.push(makeResult('CBS Logs', start, cleanDirectory(CBS_LOG)));
  }

  // Windows.old — only if exists (post-upgrade remnant)
  if (fs.existsSync(WINDOWS_OLD)) {
    const start = Date.now();
    results.push(makeResult('Windows.old', start, cleanDirectory(WINDOWS_OLD, { removeRoot: false })));
  }

  return results;
}
