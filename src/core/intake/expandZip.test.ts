import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { expandZip } from './expandZip';

describe('expandZip', () => {
  it('keeps supported entries and reports unsupported ones', () => {
    const zip = zipSync({
      'novel.txt': strToU8('본문'),
      'sub/chapter.docx': new Uint8Array([1, 2, 3]),
      'cover.png': new Uint8Array([1]),
      'legacy.doc': new Uint8Array([1]),
    });

    const { files, skipped } = expandZip(zip);

    expect(files.map((f) => f.name).sort()).toEqual(['chapter.docx', 'novel.txt']);
    expect(skipped.sort()).toEqual(['cover.png', 'legacy.doc']);
  });

  it('ignores directories and archive cruft', () => {
    const zip = zipSync({
      'a.txt': strToU8('x'),
      '__MACOSX/._a.txt': new Uint8Array([1]),
      '.DS_Store': new Uint8Array([1]),
    });

    const { files, skipped } = expandZip(zip);

    expect(files.map((f) => f.name)).toEqual(['a.txt']);
    expect(skipped).toEqual([]);
  });
});
