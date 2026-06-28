import { strToU8, zipSync, type Zippable } from 'fflate';
import type { Book, Cover, Style } from '../types';
import { styleCss, type EmbeddedFont } from './styleCss';
import { escapeXml, epubTimestamp } from './xml';

const CONTENT_DIR = 'OEBPS';
const CHAPTER_TARGET_BYTES = 20_480;
const COVER_PATH = 'cover.xhtml';
const CSS_PATH = 'style.css';
const COVER_IMAGE_ID = 'cover-image';
const FONT_PATH = 'fonts/body.otf';

export type { EmbeddedFont } from './styleCss';

export function buildEpub(
  book: Book,
  style: Style,
  embeddedFont?: EmbeddedFont,
  modified: Date = new Date(),
): Uint8Array {
  const identifier = `urn:uuid:${book.id}`;
  const coverImage = book.cover.kind === 'image' ? coverImageEntry(book.cover) : undefined;
  const chapters = splitParagraphsIntoChapters(book.paragraphs);

  const files: Zippable = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml()),
    [`${CONTENT_DIR}/${CSS_PATH}`]: strToU8(styleCss(style, embeddedFont)),
    [`${CONTENT_DIR}/nav.xhtml`]: strToU8(navXhtml(book, chapters)),
    [`${CONTENT_DIR}/toc.ncx`]: strToU8(tocNcx(book, identifier, chapters)),
    [`${CONTENT_DIR}/content.opf`]: strToU8(
      contentOpf(
        book,
        identifier,
        modified,
        chapters,
        coverImage?.fileName,
        embeddedFont !== undefined,
      ),
    ),
  };

  for (const chapter of chapters) {
    files[`${CONTENT_DIR}/${chapter.path}`] = strToU8(chapterXhtml(book, chapter));
  }

  if (coverImage) {
    files[`${CONTENT_DIR}/${coverImage.fileName}`] = coverImage.bytes;
    files[`${CONTENT_DIR}/${COVER_PATH}`] = strToU8(coverXhtml(book, coverImage.fileName));
  }

  if (embeddedFont) {
    files[`${CONTENT_DIR}/${FONT_PATH}`] = embeddedFont.bytes;
  }

  return zipSync(files, { level: 6 });
}

interface ChapterEntry {
  readonly id: string;
  readonly path: string;
  readonly paragraphs: readonly string[];
}

interface CoverImageEntry {
  readonly fileName: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

function coverImageEntry(cover: Extract<Cover, { kind: 'image' }>): CoverImageEntry {
  return {
    fileName: `cover.${extensionForMediaType(cover.mediaType)}`,
    mediaType: cover.mediaType,
    bytes: cover.bytes,
  };
}

function extensionForMediaType(mediaType: string): string {
  switch (mediaType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'img';
  }
}

function containerXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${CONTENT_DIR}/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;
}

function contentOpf(
  book: Book,
  identifier: string,
  modified: Date,
  chapters: readonly ChapterEntry[],
  coverFileName: string | undefined,
  hasEmbeddedFont: boolean,
): string {
  const coverMetadata = coverFileName
    ? `
    <meta name="cover" content="${COVER_IMAGE_ID}"/>`
    : '';
  const coverManifestItems = coverFileName
    ? `
    <item id="${COVER_IMAGE_ID}" href="${coverFileName}" media-type="${mediaTypeForFile(coverFileName)}" properties="cover-image"/>
    <item id="cover" href="${COVER_PATH}" media-type="application/xhtml+xml"/>`
    : '';
  const chapterManifestItems = chapters
    .map(
      (chapter) =>
        `
    <item id="${chapter.id}" href="${chapter.path}" media-type="application/xhtml+xml"/>`,
    )
    .join('');
  const fontManifestItem = hasEmbeddedFont
    ? `\n    <item id="font" href="${FONT_PATH}" media-type="font/otf"/>`
    : '';
  const coverSpineItem = coverFileName ? '\n    <itemref idref="cover"/>' : '';
  const chapterSpineItems = chapters
    .map((chapter) => `\n    <itemref idref="${chapter.id}"/>`)
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${escapeXml(book.language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author)}</dc:creator>
    <dc:language>${escapeXml(book.language)}</dc:language>
    <meta property="dcterms:modified">${epubTimestamp(modified)}</meta>${coverMetadata}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="${CSS_PATH}" media-type="text/css"/>${chapterManifestItems}${coverManifestItems}${fontManifestItem}
  </manifest>
  <spine toc="ncx">${coverSpineItem}${chapterSpineItems}
  </spine>
</package>
`;
}

function mediaTypeForFile(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1);
  switch (ext) {
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function splitParagraphsIntoChapters(paragraphs: readonly string[]): ChapterEntry[] {
  const chapters: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;

  const flush = (): void => {
    chapters.push(current);
    current = [];
    currentBytes = 0;
  };

  for (const paragraph of paragraphs) {
    const paragraphBytes = strToU8(renderParagraph(paragraph)).byteLength + 1;
    if (current.length > 0 && currentBytes + paragraphBytes > CHAPTER_TARGET_BYTES) flush();
    current.push(paragraph);
    currentBytes += paragraphBytes;
  }

  if (current.length > 0 || chapters.length === 0) flush();

  return chapters.map((chapterParagraphs, index) => {
    const chapterNo = index + 1;
    return {
      id: `chapter${chapterNo}`,
      path: `chapter-${chapterNo.toString().padStart(4, '0')}.xhtml`,
      paragraphs: chapterParagraphs,
    };
  });
}

function renderParagraph(paragraph: string): string {
  return paragraph.length === 0
    ? '    <p class="blank"> </p>'
    : `    <p>${escapeXml(paragraph)}</p>`;
}

function chapterXhtml(book: Book, chapter: ChapterEntry): string {
  const body = chapter.paragraphs.map(renderParagraph).join('\n');
  const tocTitle = tableOfContentsTitle(book);
  return xhtmlDocument(
    book,
    book.title,
    chapter.id === 'chapter1'
      ? `    <h1 class="chapter-title">${escapeXml(tocTitle)}</h1>
${body}`
      : body,
  );
}

function coverXhtml(book: Book, coverFileName: string): string {
  return xhtmlDocument(
    book,
    book.title,
    `    <div class="cover"><img src="${coverFileName}" alt="${escapeXml(book.title)}"/></div>`,
    'cover',
  );
}

function xhtmlDocument(
  book: Book,
  title: string,
  bodyInner: string,
  epubType: 'bodymatter' | 'cover' = 'bodymatter',
): string {
  const lang = escapeXml(book.language);
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="${CSS_PATH}"/>
  </head>
  <body>
    <section epub:type="${epubType}">
${bodyInner}
    </section>
  </body>
</html>
`;
}

function navXhtml(book: Book, chapters: readonly ChapterEntry[]): string {
  const lang = escapeXml(book.language);
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(book.title)}</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <ol>
        <li><a href="${chapters[0].path}">${escapeXml(tableOfContentsTitle(book))}</a></li>
      </ol>
    </nav>
  </body>
</html>
`;
}

function tableOfContentsTitle(book: Book): string {
  const tocTitle = book.tocTitle?.trim();
  return tocTitle && tocTitle.length > 0 ? tocTitle : book.title;
}

function tocNcx(book: Book, identifier: string, chapters: readonly ChapterEntry[]): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${escapeXml(book.language)}">
  <head>
    <meta name="dtb:uid" content="${escapeXml(identifier)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${escapeXml(tableOfContentsTitle(book))}</text></navLabel>
      <content src="${chapters[0].path}"/>
    </navPoint>
  </navMap>
</ncx>
`;
}
