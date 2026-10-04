import { strFromU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readImageZip } from '../intake/expandZip';
import { DEFAULT_STYLE, type Book } from '../types';
import { buildEpub } from './buildEpub';

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: '홍길동전',
    author: '허균',
    language: 'ko',
    body: { kind: 'text', paragraphs: ['첫 문단입니다.', '둘째 문단 & <태그> 포함.'] },
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

  it.each(['', ' \t '])('omits blank optional author metadata (%j)', (author) => {
    const opf = unzip(makeBook({ author }))['OEBPS/content.opf'];
    expect(opf).not.toMatch(/<dc:creator\b/);
  });

  it('uses an optional TOC title for the table of contents and first heading only', () => {
    const files = unzip(makeBook({ tocTitle: '본문 차례' }));
    const opf = files['OEBPS/content.opf'];
    const nav = files['OEBPS/nav.xhtml'];
    const ncx = files['OEBPS/toc.ncx'];
    const chapter = files['OEBPS/chapter-0001.xhtml'];

    expect(opf).toContain('<dc:title>홍길동전</dc:title>');
    expect(nav).toContain('>본문 차례</a>');
    expect(ncx).toContain('<navLabel><text>본문 차례</text></navLabel>');
    expect(chapter).toContain('<h1 class="chapter-title">본문 차례</h1>');
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
      body: {
        kind: 'text',
        paragraphs: Array.from({ length: 90 }, (_, index) => `문단 ${index} ${'가'.repeat(300)}`),
      },
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

  it('packages naturally ordered image pages without copying, reencoding, or TOC noise', () => {
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
    const pages = readImageZip({
      name: 'images.zip',
      bytes: zipSync({
        'b/page.jpg': png,
        'a/page.jpg': webp,
      }),
    });
    const book = makeBook({
      body: { kind: 'images', pages },
      tocTitle: '이미지 본문',
      cover: { kind: 'image', bytes: png, mediaType: 'image/png' },
    });
    // An image book ignores even a directly supplied font and text typography.
    const bytes = buildEpub(book, DEFAULT_STYLE, { family: 'Unused', bytes: new Uint8Array([1]) });
    const compression: Record<string, number> = {};
    const archive = unzipSync(bytes, {
      filter: (entry) => {
        compression[entry.name] = entry.compression;
        return true;
      },
    });
    expect(archive['OEBPS/images/page-0001.webp']).toEqual(webp);
    expect(archive['OEBPS/images/page-0002.png']).toEqual(png);
    expect(compression['OEBPS/images/page-0001.webp']).toBe(0);
    expect(compression['OEBPS/images/page-0002.png']).toBe(0);
    expect(archive['OEBPS/cover.png']).toEqual(png);
    expect(archive['OEBPS/fonts/body.otf']).toBeUndefined();

    const opf = strFromU8(archive['OEBPS/content.opf']);
    const manifest = [...opf.matchAll(/<item id="([^"]+)" href="([^"]+)" media-type="([^"]+)"/g)];
    const pathsById: Record<string, string> = {};
    for (const [, id, path] of manifest) {
      pathsById[id] = path;
      expect(archive[`OEBPS/${path}`]).toBeDefined();
    }
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((match) => match[1]);
    expect(spine).toEqual(['cover', 'page1', 'page2']);
    expect(spine.map((id) => pathsById[id])).toEqual([
      'cover.xhtml',
      'page-0001.xhtml',
      'page-0002.xhtml',
    ]);
    expect(opf).toContain('href="images/page-0001.webp" media-type="image/webp"');
    expect(opf).toContain('href="images/page-0002.png" media-type="image/png"');
    expect(opf).not.toContain('rendition:layout');
    for (const number of ['0001', '0002']) {
      const xhtml = strFromU8(archive[`OEBPS/page-${number}.xhtml`]);
      const imagePath = /<img src="([^"]+)"/.exec(xhtml)![1];
      expect(archive[`OEBPS/${imagePath}`]).toBeDefined();
      expect(xhtml).not.toContain('<p>');
      expect(xhtml).not.toContain('<h1');
    }
    const nav = strFromU8(archive['OEBPS/nav.xhtml']);
    const ncx = strFromU8(archive['OEBPS/toc.ncx']);
    expect(nav.match(/<li>/g)).toHaveLength(1);
    expect(nav).toContain('href="page-0001.xhtml">이미지 본문</a>');
    expect(ncx).toContain('<content src="page-0001.xhtml"/>');
    expect(ncx.match(/<navPoint /g)).toHaveLength(1);
    const css = strFromU8(archive['OEBPS/style.css']);
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('max-height: 100%');
    expect(css).toContain('object-fit: contain');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('text-indent');
  });

  it('rejects an image body without pages instead of writing broken nav links', () => {
    expect(() =>
      buildEpub(makeBook({ body: { kind: 'images', pages: [] } }), DEFAULT_STYLE),
    ).toThrow('at least one page');
  });

  it('is deterministic for a fixed modified time', () => {
    const at = new Date('2026-06-16T00:00:00.000Z');
    const a = buildEpub(makeBook(), DEFAULT_STYLE, undefined, at);
    const b = buildEpub(makeBook(), DEFAULT_STYLE, undefined, at);
    expect(a).toEqual(b);
  });
});
