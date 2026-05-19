import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(__dirname, '..', 'logs');

function getLogPath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `cleanup-${date}.log`);
}

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function log(level: 'INFO' | 'WARN' | 'DEBUG' | 'ERROR', message: string): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;

  console.log(line);

  try {
    ensureLogDir();
    fs.appendFileSync(getLogPath(), line + '\n');
  } catch {
    // If logging fails, don't crash the service
  }
}

/** Rotate logs older than retainDays */
export function rotateLogs(retainDays = 30): void {
  if (!fs.existsSync(LOG_DIR)) return;
  const cutoff = Date.now() - retainDays * 86400_000;
  try {
    for (const file of fs.readdirSync(LOG_DIR)) {
      const full = path.join(LOG_DIR, file);
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        log('INFO', `Rotated old log: ${file}`);
      }
    }
  } catch {
    // Non-fatal
  }
}
