import { execSync } from 'child_process';
import type { CleanResult } from './types';
import { makeResult } from './utils';

export async function cleanRecycleBin(): Promise<CleanResult> {
  const label = 'Recycle Bin';
  const start = Date.now();
  const errors: string[] = [];

  try {
    // PowerShell's Clear-RecycleBin is the cleanest way to do this on Windows
    execSync('powershell.exe -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', {
      timeout: 30_000,
    });
  } catch (e) {
    errors.push((e as Error).message);
  }

  return makeResult(label, start, { bytes: 0, files: 0, dirs: 0, errors });
}

export async function cleanNetwork(): Promise<CleanResult[]> {
  const results: CleanResult[] = [];

  const commands: Array<{ label: string; cmd: string }> = [
    { label: 'DNS Cache', cmd: 'ipconfig /flushdns' },
    { label: 'ARP Cache', cmd: 'arp -d *' },
    { label: 'NetBIOS Cache', cmd: 'nbtstat -R' },
    { label: 'Winsock Catalog', cmd: 'netsh winsock reset' },
  ];

  for (const { label, cmd } of commands) {
    const start = Date.now();
    const errors: string[] = [];
    try {
      execSync(cmd, { timeout: 10_000, stdio: 'ignore' });
    } catch (e) {
      errors.push((e as Error).message);
    }
    results.push(makeResult(label, start, { bytes: 0, files: 0, dirs: 0, errors }));
  }

  return results;
}
