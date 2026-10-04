import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { expandZip } from '../intake/expandZip';
import type { BookSource } from '../types';
import { UnsupportedFormatError } from '../parse/types';
import { convertDocument, safeFileName } from './convertDocument';

const txtFile = (name: string, text: string): BookSource => ({
  kind: 'document',
  name,
  bytes: new TextEncoder().encode(text),
});

describe('convertDocument', () => {
  it('converts a .txt Document end-to-end into a downloadable EPUB', async () => {
    const result = await convertDocument(txtFile('홍길동전.txt', '첫 문단.\n\n둘째 문단.'));

    expect(result.title).toBe('홍길동전');
    expect(result.fileName).toBe('홍길동전.epub');

    const archive = unzipSync(result.bytes);
    expect(strFromU8(archive['mimetype'])).toBe('application/epub+zip');
    const chapter = strFromU8(archive['OEBPS/chapter-0001.xhtml']);
    expect(chapter).toContain('<p>첫 문단.</p>');
    expect(chapter).toContain('<p>둘째 문단.</p>');
  });

  it('passes a separate TOC title without changing EPUB metadata Title', async () => {
    const result = await convertDocument(txtFile('raw.txt', '본문'), {
      title: '메타 제목',
      tocTitle: '차례 제목',
    });
    const archive = unzipSync(result.bytes);
    const opf = strFromU8(archive['OEBPS/content.opf']);
    const nav = strFromU8(archive['OEBPS/nav.xhtml']);
    expect(opf).toContain('<dc:title>메타 제목</dc:title>');
    expect(nav).toContain('>차례 제목</a>');
  });

  it('lets an explicit Title and author override the derived ones', async () => {
    const result = await convertDocument(txtFile('raw.txt', '본문'), {
      title: '새 제목',
      author: '저자',
    });
    const opf = strFromU8(unzipSync(result.bytes)['OEBPS/content.opf']);
    expect(result.title).toBe('새 제목');
    expect(opf).toContain('<dc:creator>저자</dc:creator>');
  });

  it('converts document ZIP entries independently with basename-derived titles', async () => {
    const sources = expandZip({
      name: 'documents.zip',
      bytes: zipSync({
        'a/book.txt': strToU8('First document.'),
        'b/book.txt': strToU8('Second document.'),
      }),
    }).files;
    const results = await Promise.all(sources.map((source) => convertDocument(source)));
    expect(results.map((result) => result.title)).toEqual(['book', 'book']);
    expect(strFromU8(unzipSync(results[0].bytes)['OEBPS/chapter-0001.xhtml'])).toContain(
      '<p>First document.</p>',
    );
    expect(strFromU8(unzipSync(results[1].bytes)['OEBPS/chapter-0001.xhtml'])).toContain(
      '<p>Second document.</p>',
    );
  });

  it('reports corrupt image page names before attempting to package an EPUB', async () => {
    await expect(
      convertDocument({
        kind: 'image-zip',
        name: 'pages.zip',
        bytes: zipSync({ 'folder/page.jpg': strToU8('broken') }),
      }),
    ).rejects.toThrow('folder/page.jpg');
  });

  it('rejects unsupported formats', async () => {
    await expect(convertDocument(txtFile('legacy.doc', 'x'))).rejects.toBeInstanceOf(
      UnsupportedFormatError,
    );
  });
});

describe('safeFileName', () => {
  it('replaces filesystem-unsafe characters', () => {
    expect(safeFileName('a/b:c?*"<>|d')).toBe('a_b_c______d');
  });

  it('falls back to "book" when nothing usable remains', () => {
    expect(safeFileName('   ')).toBe('book');
  });
});
