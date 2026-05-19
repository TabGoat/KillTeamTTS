export interface CleanResult {
  target: string;
  bytesFreed: number;
  filesDeleted: number;
  directoriesRemoved: number;
  errors: string[];
  durationMs: number;
  skipped: boolean;
  skipReason?: string;
}

export interface CleanSummary {
  startedAt: Date;
  finishedAt: Date;
  totalBytesFreed: number;
  totalFilesDeleted: number;
  results: CleanResult[];
}
