import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { zipBooks } from './zipBooks';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('zipBooks', () => {
  it('bundles every EPUB into one archive', () => {
    const archive = unzipSync(
      zipBooks([
        { fileName: 'a.epub', bytes: bytes(1) },
        { fileName: 'b.epub', bytes: bytes(2) },
      ]),
    );
    expect(Object.keys(archive).sort()).toEqual(['a.epub', 'b.epub']);
    expect(archive['a.epub']).toEqual(bytes(1));
  });

  it('de-duplicates colliding filenames instead of overwriting', () => {
    const archive = unzipSync(
      zipBooks([
        { fileName: '제목.epub', bytes: bytes(1) },
        { fileName: '제목.epub', bytes: bytes(2) },
        { fileName: '제목.epub', bytes: bytes(3) },
      ]),
    );
    expect(Object.keys(archive).sort()).toEqual(['제목 (2).epub', '제목 (3).epub', '제목.epub']);
    expect(archive['제목.epub']).toEqual(bytes(1));
    expect(archive['제목 (2).epub']).toEqual(bytes(2));
  });
});
