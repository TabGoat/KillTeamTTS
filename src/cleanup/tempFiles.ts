import path from 'path';
import type { CleanResult } from './types';
import { cleanDirectory, expandEnv, makeResult } from './utils';

const TEMP_TARGETS = [
  '%TEMP%',
  '%TMP%',
  '%LOCALAPPDATA%\\Temp',
  'C:\\Windows\\Temp',
];

export async function cleanTempFiles(): Promise<CleanResult[]> {
  const results: CleanResult[] = [];
  const seen = new Set<string>();

  for (const raw of TEMP_TARGETS) {
    const resolved = path.resolve(expandEnv(raw));
    if (seen.has(resolved)) continue; // deduplicate (TEMP and TMP often point to the same dir)
    seen.add(resolved);

    const start = Date.now();
    const data = cleanDirectory(resolved);
    results.push(makeResult(raw, start, data));
  }

  return results;
}
