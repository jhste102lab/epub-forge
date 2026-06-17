import { zipSync, type Zippable } from 'fflate';

export interface EpubFile {
  readonly fileName: string;
  readonly bytes: Uint8Array;
}

/** Bundle finished EPUBs into a single ZIP, de-duplicating colliding filenames. */
export function zipBooks(books: readonly EpubFile[]): Uint8Array {
  const files: Zippable = {};
  for (const book of books) {
    files[uniqueName(book.fileName, files)] = book.bytes;
  }
  return zipSync(files);
}

function uniqueName(name: string, taken: Zippable): string {
  if (!(name in taken)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (candidate in taken) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  return candidate;
}
