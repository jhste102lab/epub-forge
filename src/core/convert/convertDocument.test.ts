import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { FileLike } from '../parse/types';
import { UnsupportedFormatError } from '../parse/types';
import { convertDocument, safeFileName } from './convertDocument';

const txtFile = (name: string, text: string): FileLike => ({
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

  it('lets an explicit Title and author override the derived ones', async () => {
    const result = await convertDocument(txtFile('raw.txt', '본문'), {
      title: '새 제목',
      author: '저자',
    });
    const opf = strFromU8(unzipSync(result.bytes)['OEBPS/content.opf']);
    expect(result.title).toBe('새 제목');
    expect(opf).toContain('<dc:creator>저자</dc:creator>');
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
