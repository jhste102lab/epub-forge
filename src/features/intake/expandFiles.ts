import { expandZip, type ExpandResult } from '../../core/intake/expandZip';
import { isSupported } from '../../core/parse/registry';
import { extensionOf } from '../../core/parse/types';
import type { BookSource } from '../../core/types';

/**
 * Turn browser Files into sources: document ZIPs are unpacked, image ZIPs stay
 * intact until worker conversion, and unsupported inputs are reported in the
 * existing intake notice. One failed archive does not discard sibling inputs.
 */
export async function expandFiles(input: readonly File[]): Promise<ExpandResult> {
  const files: BookSource[] = [];
  const skipped: string[] = [];

  for (const file of input) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (extensionOf(file.name) === 'zip') {
        const result = expandZip({ name: file.name, bytes });
        files.push(...result.files);
        skipped.push(...result.skipped);
      } else {
        const candidate: BookSource = { kind: 'document', name: file.name, bytes };
        if (isSupported(candidate)) files.push(candidate);
        else skipped.push(file.name);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      skipped.push(`${file.name}: ${message}`);
    }
  }
  return { files, skipped };
}
