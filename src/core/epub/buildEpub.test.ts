import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, type Book } from '../types';
import { buildEpub } from './buildEpub';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: '홍길동전',
    author: '허균',
    language: 'ko',
    paragraphs: ['첫 문단입니다.', '둘째 문단 & <태그> 포함.'],
    cover: { kind: 'none' },
    ...overrides,
  };
}

function unzip(book: Book): Record<string, string> {
  const archive = unzipSync(
    buildEpub(book, DEFAULT_STYLE, undefined, new Date('2026-06-16T00:00:00.000Z')),
  );
  const out: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(archive)) out[path] = strFromU8(bytes);
  return out;
}

describe('buildEpub', () => {
  it('writes mimetype first and uncompressed', () => {
    const archive = unzipSync(buildEpub(makeBook(), DEFAULT_STYLE));
    expect(strFromU8(archive['mimetype'])).toBe('application/epub+zip');
  });

  it('points the container at the OPF package', () => {
    const files = unzip(makeBook());
    expect(files['META-INF/container.xml']).toContain('OEBPS/content.opf');
  });

  it('puts Title and author into the OPF metadata', () => {
    const opf = unzip(makeBook())['OEBPS/content.opf'];
    expect(opf).toContain('<dc:title>홍길동전</dc:title>');
    expect(opf).toContain('<dc:creator>허균</dc:creator>');
    expect(opf).toContain('<dc:language>ko</dc:language>');
    expect(opf).toContain('urn:uuid:11111111-1111-4111-8111-111111111111');
  });

  it('has exactly one TOC entry equal to the Title', () => {
    const nav = unzip(makeBook())['OEBPS/nav.xhtml'];
    const entries = nav.match(/<li>/g) ?? [];
    expect(entries).toHaveLength(1);
    expect(nav).toContain('>홍길동전</a>');
  });

  it('renders paragraphs and escapes XML', () => {
    const chapter = unzip(makeBook())['OEBPS/chapter-0001.xhtml'];
    expect(chapter).toContain('<p>첫 문단입니다.</p>');
    expect(chapter).toContain('&amp; &lt;태그&gt;');
  });

  it('omits cover artifacts when there is no Cover', () => {
    const files = unzip(makeBook());
    expect(files['OEBPS/cover.xhtml']).toBeUndefined();
    expect(files['OEBPS/content.opf']).not.toContain('cover-image');
  });

  it('embeds the Cover image and references it when provided', () => {
    const book = makeBook({
      cover: { kind: 'image', bytes: new Uint8Array([1, 2, 3, 4]), mediaType: 'image/png' },
    });
    const archive = unzipSync(buildEpub(book, DEFAULT_STYLE));
    expect(archive['OEBPS/cover.png']).toEqual(new Uint8Array([1, 2, 3, 4]));
    const opf = strFromU8(archive['OEBPS/content.opf']);
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('<meta name="cover" content="cover-image"/>');
    expect(opf).toContain('<itemref idref="cover"/>');
    expect(opf).not.toContain('linear="no"');
  });

  it('splits large books into multiple spine chapters without adding TOC noise', () => {
    const book = makeBook({
      paragraphs: Array.from({ length: 90 }, (_, index) => `문단 ${index} ${'가'.repeat(300)}`),
    });
    const files = unzip(book);
    const chapterPaths = Object.keys(files).filter((path) =>
      /OEBPS\/chapter-\d{4}\.xhtml/.test(path),
    );
    expect(chapterPaths.length).toBeGreaterThan(1);
    expect(files['OEBPS/content.opf']).toContain('<itemref idref="chapter1"/>');
    expect(files['OEBPS/content.opf']).toContain(
      `<itemref idref="chapter${chapterPaths.length}"/>`,
    );
    expect(files['OEBPS/nav.xhtml'].match(/<li>/g) ?? []).toHaveLength(1);
    expect(files['OEBPS/nav.xhtml']).toContain('href="chapter-0001.xhtml"');
  });

  it('embeds a font and wires the @font-face + manifest item', () => {
    const fontBytes = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 1, 2, 3, 4]); // "OTTO"...
    const archive = unzipSync(
      buildEpub(makeBook(), DEFAULT_STYLE, { family: 'Noto Serif KR', bytes: fontBytes }),
    );
    expect(archive['OEBPS/fonts/body.otf']).toEqual(fontBytes);
    const opf = strFromU8(archive['OEBPS/content.opf']);
    expect(opf).toContain('href="fonts/body.otf" media-type="font/otf"');
    const css = strFromU8(archive['OEBPS/style.css']);
    expect(css).toContain('@font-face');
    expect(css).toContain("font-family: 'Noto Serif KR'");
    expect(css).toContain("url(fonts/body.otf) format('opentype')");
  });

  it('is deterministic for a fixed modified time', () => {
    const at = new Date('2026-06-16T00:00:00.000Z');
    const a = buildEpub(makeBook(), DEFAULT_STYLE, undefined, at);
    const b = buildEpub(makeBook(), DEFAULT_STYLE, undefined, at);
    expect(a).toEqual(b);
  });
});
