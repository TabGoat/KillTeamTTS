import fs from 'fs';
import path from 'path';
import type { CleanResult } from './types';

/**
 * Recursively deletes all contents of a directory (not the directory itself).
 * Returns bytes freed and files deleted.
 */
export function cleanDirectory(
  dirPath: string,
  options: { removeRoot?: boolean; olderThanDays?: number } = {}
): { bytes: number; files: number; dirs: number; errors: string[] } {
  let bytes = 0;
  let files = 0;
  let dirs = 0;
  const errors: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return { bytes, files, dirs, errors };
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    errors.push(`Cannot read ${dirPath}: ${(e as Error).message}`);
    return { bytes, files, dirs, errors };
  }

  const cutoffMs = options.olderThanDays
    ? Date.now() - options.olderThanDays * 86400_000
    : 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        const result = cleanDirectory(fullPath, options);
        bytes += result.bytes;
        files += result.files;
        dirs += result.dirs;
        errors.push(...result.errors);
        try {
          fs.rmdirSync(fullPath);
          dirs++;
        } catch {
          // Directory not empty (some files locked) — skip
        }
      } else {
        const stat = fs.statSync(fullPath);
        if (cutoffMs > 0 && stat.mtimeMs > cutoffMs) continue; // too recent
        bytes += stat.size;
        fs.unlinkSync(fullPath);
        files++;
      }
    } catch (e) {
      errors.push(`${fullPath}: ${(e as Error).message}`);
    }
  }

  if (options.removeRoot) {
    try {
      fs.rmdirSync(dirPath);
      dirs++;
    } catch {
      // Not empty — leave it
    }
  }

  return { bytes, files, dirs, errors };
}

export function expandEnv(p: string): string {
  return p.replace(/%([^%]+)%/g, (_, key) => process.env[key] ?? `%${key}%`);
}

export function makeResult(
  target: string,
  startTime: number,
  data: { bytes: number; files: number; dirs: number; errors: string[] }
): CleanResult {
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

export function skippedResult(target: string, reason: string): CleanResult {
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
