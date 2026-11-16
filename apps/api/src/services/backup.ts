import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config.js';

/**
 * Daily database backup with `mongodump` (MongoDB Database Tools must be installed on the worker host).
 * Writes a gzipped archive to BACKUP_DIR and keeps the newest BACKUP_KEEP files.
 * For off-site safety, sync BACKUP_DIR to S3 / Backblaze / Google Drive (see docs/HANDOFF.md).
 */
export async function backupDatabase() {
  const dir = process.env.BACKUP_DIR || path.resolve('backups');
  const keep = Number(process.env.BACKUP_KEEP || 14);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `waves4u-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.archive.gz`);
  await new Promise<void>((resolve, reject) => {
    const p = spawn('mongodump', [`--uri=${env.MONGO_URI}`, `--archive=${file}`, '--gzip'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`mongodump exited ${code}: ${err.slice(-500)}`))));
  });
  const files = (await fs.readdir(dir)).filter((f) => f.startsWith('waves4u-') && f.endsWith('.archive.gz')).sort();
  for (const old of files.slice(0, Math.max(0, files.length - keep))) await fs.unlink(path.join(dir, old));
  return file;
}
