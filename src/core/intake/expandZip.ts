import { unzipSync } from 'fflate';
import { isSupported } from '../parse/registry';
import type { FileLike } from '../parse/types';

export interface ExpandResult {
  /** Supported documents found, ready to become Books. */
  readonly files: FileLike[];
  /** Names of entries skipped because their format is unsupported. */
  readonly skipped: string[];
}

/**
 * Unpack a `.zip` of documents client-side: every supported entry becomes a
 * Book, unsupported entries are reported as skipped. Directory entries and
 * archive cruft (dotfiles, `__MACOSX`) are ignored silently.
 */
export function expandZip(zipBytes: Uint8Array): ExpandResult {
  const entries = unzipSync(zipBytes);
  const files: FileLike[] = [];
  const skipped: string[] = [];

  for (const [path, bytes] of Object.entries(entries)) {
    if (isIgnored(path)) continue;
    const name = baseName(path);
    const file: FileLike = { name, bytes };
    if (isSupported(file)) files.push(file);
    else skipped.push(name);
  }
  return { files, skipped };
}

function isIgnored(path: string): boolean {
  if (path.endsWith('/')) return true; // directory entry
  if (path.includes('__MACOSX')) return true;
  return baseName(path).startsWith('.');
}

function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}
