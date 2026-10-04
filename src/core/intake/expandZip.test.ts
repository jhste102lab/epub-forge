import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { expandZip, readImageZip } from './expandZip';

const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);
const webp = Uint8Array.from(
  atob('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'),
  (c) => c.charCodeAt(0),
);

describe('expandZip', () => {
  it('preserves document extraction and reports images in mixed archives', () => {
    const archive = {
      name: 'documents.zip',
      bytes: zipSync({
        'novel.txt': strToU8('본문'),
        'sub/chapter.docx': new Uint8Array([1, 2, 3]),
        'cover.png': png,
        'legacy.doc': new Uint8Array([1]),
      }),
    };
    const { files, skipped } = expandZip(archive);
    expect(files.map((f) => [f.kind, f.name])).toEqual([
      ['document', 'novel.txt'],
      ['document', 'sub/chapter.docx'],
    ]);
    expect(skipped).toEqual(['cover.png', 'legacy.doc']);
    expect(files[0].bytes).toEqual(strToU8('본문'));
  });

  it('keeps one image archive source without copying its bytes', () => {
    const archive = {
      name: '약속의 네버랜드 01권.zip',
      bytes: zipSync({
        '__ridi__10.jpg': webp,
        '__ridi__0.jpg': webp,
        '__ridi__1.png': png,
        'notes.nfo': strToU8('unsupported companion'),
      }),
    };
    const { files, skipped } = expandZip(archive);
    expect(files).toHaveLength(1);
    expect(files[0]).toEqual({ kind: 'image-zip', ...archive });
    expect(files[0].bytes).toBe(archive.bytes);
    expect(skipped).toEqual(['notes.nfo']);
  });

  it('keeps identical document basenames in separate folders distinct', () => {
    const { files } = expandZip({
      name: 'documents.zip',
      bytes: zipSync({
        'a/book.txt': strToU8('a'),
        'b/book.txt': strToU8('b'),
      }),
    });
    expect(files.map((f) => f.name)).toEqual(['a/book.txt', 'b/book.txt']);
    expect(files.map((f) => [...f.bytes])).toEqual([[97], [98]]);
  });

  it('ignores directories, dot folders, and macOS archive cruft', () => {
    const { files, skipped } = expandZip({
      name: 'images.zip',
      bytes: zipSync({
        'a.png': png,
        'folder/': new Uint8Array(),
        '__MACOSX/._a.png': new Uint8Array([1]),
        '.DS_Store': new Uint8Array([1]),
        '.hidden/b.png': new Uint8Array([1]),
      }),
    });
    expect(files).toHaveLength(1);
    expect(readImageZip(files[0]).map((page) => page.sourcePath)).toEqual(['a.png']);
    expect(skipped).toEqual([]);
  });

  it('does not inflate corrupt image payloads during classification', () => {
    const bytes = zipSync({ 'page.png': [png, { level: 9 }] });
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const payloadOffset = 30 + header.getUint16(26, true) + header.getUint16(28, true);
    bytes[payloadOffset] = 7; // DEFLATE reserved block type; central directory stays valid.
    const archive = { name: 'corrupt-page.zip', bytes };
    expect(expandZip(archive).files[0].kind).toBe('image-zip');
    expect(() => readImageZip(archive)).toThrow();
  });

  it('rejects empty, unsupported, and corrupt archives clearly', () => {
    expect(() => expandZip({ name: 'empty.zip', bytes: zipSync({}) })).toThrow('no supported');
    expect(() =>
      expandZip({ name: 'other.zip', bytes: zipSync({ 'a.bin': new Uint8Array([1]) }) }),
    ).toThrow('no supported');
    expect(() => expandZip({ name: 'bad.zip', bytes: new Uint8Array([1, 2, 3]) })).toThrow();
  });

  it('rejects unsupported image formats instead of dropping pages', () => {
    expect(() =>
      expandZip({
        name: 'pages.zip',
        bytes: zipSync({ '1.png': png, '2.gif': new Uint8Array([1]) }),
      }),
    ).toThrow('2.gif');
  });
});

describe('readImageZip', () => {
  it('sorts punctuation and numeric path runs naturally, not by insertion order', () => {
    const pages = readImageZip({
      name: 'pages.zip',
      bytes: zipSync({
        '__ridi__10.jpg': webp,
        '__ridi__2.jpg': webp,
        '__ridi__1.jpg': webp,
        '__ridi__0.jpg': webp,
        '!000.jpg': webp,
        'folder10/page.png': png,
        'folder2/page.png': png,
      }),
    });
    expect(pages.map((page) => page.sourcePath)).toEqual([
      '!000.jpg',
      '__ridi__0.jpg',
      '__ridi__1.jpg',
      '__ridi__2.jpg',
      '__ridi__10.jpg',
      'folder2/page.png',
      'folder10/page.png',
    ]);
    expect(pages[0].mediaType).toBe('image/webp');
    expect(pages[0].bytes).toEqual(webp);
  });

  it('sniffs actual format and preserves folder paths and original bytes', () => {
    const pages = readImageZip({
      name: 'pages.zip',
      bytes: zipSync({
        'a/page.jpg': webp,
        'b/page.jpg': png,
      }),
    });
    expect(pages.map((page) => [page.sourcePath, page.mediaType])).toEqual([
      ['a/page.jpg', 'image/webp'],
      ['b/page.jpg', 'image/png'],
    ]);
    expect(pages[0].bytes).toEqual(webp);
    expect(pages[1].bytes).toEqual(png);
  });

  it('rejects page data whose actual format is invalid or unsupported', () => {
    expect(() =>
      readImageZip({ name: 'pages.zip', bytes: zipSync({ 'page.jpg': strToU8('not an image') }) }),
    ).toThrow('page.jpg');
    expect(() =>
      readImageZip({
        name: 'mixed.zip',
        bytes: zipSync({ 'page.png': png, 'book.txt': strToU8('text') }),
      }),
    ).toThrow('contains documents');
  });
});
