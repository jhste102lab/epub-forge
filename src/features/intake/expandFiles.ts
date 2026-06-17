import { expandZip, type ExpandResult } from '../../core/intake/expandZip';
import { isSupported } from '../../core/parse/registry';
import { extensionOf, type FileLike } from '../../core/parse/types';

/**
 * Turn dropped/selected browser Files into Books-to-be: `.zip` archives are
 * unpacked, plain documents pass through, and anything unsupported is collected
 * as skipped so the UI can tell the user plainly.
 */
export async function expandFiles(input: readonly File[]): Promise<ExpandResult> {
  const files: FileLike[] = [];
  const skipped: string[] = [];

  for (const file of input) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (extensionOf(file.name) === 'zip') {
      const result = expandZip(bytes);
      files.push(...result.files);
      skipped.push(...result.skipped);
    } else {
      const candidate: FileLike = { name: file.name, bytes };
      if (isSupported(candidate)) files.push(candidate);
      else skipped.push(file.name);
    }
  }
  return { files, skipped };
}
