import type { CleanResult, CleanSummary } from './types';
import { cleanTempFiles } from './tempFiles';
import { cleanBrowserCaches } from './browserCache';
import { cleanWindowsSystem } from './windowsSystem';
import { cleanRecycleBin, cleanNetwork } from './recycleBin';
import { log } from '../logger';

export async function runAllCleaners(): Promise<CleanSummary> {
  const startedAt = new Date();
  log('INFO', '=== Cleanup started ===');

  // Run all cleaner groups in parallel for maximum speed
  const [tempResults, browserResults, systemResults, recycleBinResult, networkResults] =
    await Promise.all([
      cleanTempFiles().catch((e) => errorResult('Temp Files', e)),
      cleanBrowserCaches().catch((e) => errorResult('Browser Caches', e)),
      cleanWindowsSystem().catch((e) => errorResult('Windows System', e)),
      cleanRecycleBin().catch((e) => errorResultSingle('Recycle Bin', e)),
      cleanNetwork().catch((e) => errorResult('Network', e)),
    ]);

  const results: CleanResult[] = [
    ...tempResults,
    ...browserResults,
    ...systemResults,
    recycleBinResult,
    ...networkResults,
  ];

  const finishedAt = new Date();
  const totalBytesFreed = results.reduce((sum, r) => sum + r.bytesFreed, 0);
  const totalFilesDeleted = results.reduce((sum, r) => sum + r.filesDeleted, 0);

  const summary: CleanSummary = {
    startedAt,
    finishedAt,
    totalBytesFreed,
    totalFilesDeleted,
    results,
  };

  logSummary(summary);
  return summary;
}

function logSummary(summary: CleanSummary): void {
  const durationSec = ((summary.finishedAt.getTime() - summary.startedAt.getTime()) / 1000).toFixed(1);
  const mbFreed = (summary.totalBytesFreed / 1024 / 1024).toFixed(2);

  log('INFO', `=== Cleanup complete in ${durationSec}s ===`);
  log('INFO', `Total freed: ${mbFreed} MB across ${summary.totalFilesDeleted} files`);

  for (const r of summary.results) {
    if (r.skipped) {
      log('DEBUG', `  SKIP  ${r.target}: ${r.skipReason}`);
      continue;
    }
    const mb = (r.bytesFreed / 1024 / 1024).toFixed(2);
    const status = r.errors.length > 0 ? 'WARN ' : 'OK   ';
    log('INFO', `  ${status} ${r.target}: ${mb} MB, ${r.filesDeleted} files (${r.durationMs}ms)`);
    for (const err of r.errors.slice(0, 3)) {
      log('WARN', `         ↳ ${err}`);
    }
    if (r.errors.length > 3) {
      log('WARN', `         ↳ ...and ${r.errors.length - 3} more errors`);
    }
  }
}

function errorResult(label: string, e: unknown): CleanResult[] {
  return [
    {
      target: label,
      bytesFreed: 0,
      filesDeleted: 0,
      directoriesRemoved: 0,
      errors: [(e as Error).message],
      durationMs: 0,
      skipped: false,
    },
  ];
}

function errorResultSingle(label: string, e: unknown): CleanResult {
  return {
    target: label,
    bytesFreed: 0,
    filesDeleted: 0,
    directoriesRemoved: 0,
    errors: [(e as Error).message],
    durationMs: 0,
    skipped: false,
  };
}
