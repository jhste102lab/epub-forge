import { strToU8, zipSync, type Zippable } from 'fflate';
import type { Book, Cover, Style } from '../types';
import { escapeXml, epubTimestamp } from './xml';

const CONTENT_DIR = 'OEBPS';
const CHAPTER_PATH = 'chapter-1.xhtml';
const COVER_PATH = 'cover.xhtml';
const CSS_PATH = 'style.css';
const COVER_IMAGE_ID = 'cover-image';
const FONT_PATH = 'fonts/body.otf';

/** A font subset to embed so the chosen typeface renders on any reader. */
export interface EmbeddedFont {
  /** The `@font-face` family name; must match the family in `Style.fontFamily`. */
  readonly family: string;
  readonly bytes: Uint8Array;
}

/**
 * Build a valid EPUB3 by hand so the
 * Title, the single TOC entry, and the Cover are fully under our control.
 * Pure: identical inputs (plus the supplied `modified` time) yield identical
 * bytes. Returns the raw `.epub` archive.
 */
export function buildEpub(
  book: Book,
  style: Style,
  embeddedFont?: EmbeddedFont,
  modified: Date = new Date(),
): Uint8Array {
  const identifier = `urn:uuid:${book.id}`;
  const coverImage = book.cover.kind === 'image' ? coverImageEntry(book.cover) : undefined;

  const files: Zippable = {
    // The mimetype must be the first entry and stored uncompressed.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml()),
    [`${CONTENT_DIR}/${CSS_PATH}`]: strToU8(styleCss(style, embeddedFont)),
    [`${CONTENT_DIR}/${CHAPTER_PATH}`]: strToU8(chapterXhtml(book)),
    [`${CONTENT_DIR}/nav.xhtml`]: strToU8(navXhtml(book)),
    [`${CONTENT_DIR}/toc.ncx`]: strToU8(tocNcx(book, identifier)),
    [`${CONTENT_DIR}/content.opf`]: strToU8(
      contentOpf(book, identifier, modified, coverImage?.fileName, embeddedFont !== undefined),
    ),
  };

  if (coverImage) {
    files[`${CONTENT_DIR}/${coverImage.fileName}`] = coverImage.bytes;
    files[`${CONTENT_DIR}/${COVER_PATH}`] = strToU8(coverXhtml(book, coverImage.fileName));
  }

  if (embeddedFont) {
    files[`${CONTENT_DIR}/${FONT_PATH}`] = embeddedFont.bytes;
  }

  return zipSync(files, { level: 6 });
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
  coverFileName: string | undefined,
  hasEmbeddedFont: boolean,
): string {
  const coverManifestItems = coverFileName
    ? `
    <item id="${COVER_IMAGE_ID}" href="${coverFileName}" media-type="${mediaTypeForFile(coverFileName)}" properties="cover-image"/>
    <item id="cover" href="${COVER_PATH}" media-type="application/xhtml+xml"/>`
    : '';
  const fontManifestItem = hasEmbeddedFont
    ? `\n    <item id="font" href="${FONT_PATH}" media-type="font/otf"/>`
    : '';
  const coverSpineItem = coverFileName ? '\n    <itemref idref="cover" linear="no"/>' : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${escapeXml(book.language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author)}</dc:creator>
    <dc:language>${escapeXml(book.language)}</dc:language>
    <meta property="dcterms:modified">${epubTimestamp(modified)}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="${CSS_PATH}" media-type="text/css"/>
    <item id="chapter1" href="${CHAPTER_PATH}" media-type="application/xhtml+xml"/>${coverManifestItems}${fontManifestItem}
  </manifest>
  <spine toc="ncx">${coverSpineItem}
    <itemref idref="chapter1"/>
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

function chapterXhtml(book: Book): string {
  const body = book.paragraphs
    .map((p) => (p.length === 0 ? '    <p class="blank"> </p>' : `    <p>${escapeXml(p)}</p>`))
    .join('\n');
  return xhtmlDocument(
    book,
    book.title,
    `    <h1 class="chapter-title">${escapeXml(book.title)}</h1>
${body}`,
  );
}

function coverXhtml(book: Book, coverFileName: string): string {
  return xhtmlDocument(
    book,
    book.title,
    `    <div class="cover"><img src="${coverFileName}" alt="${escapeXml(book.title)}"/></div>`,
  );
}

function xhtmlDocument(book: Book, title: string, bodyInner: string): string {
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
    <section epub:type="bodymatter">
${bodyInner}
    </section>
  </body>
</html>
`;
}

function navXhtml(book: Book): string {
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
        <li><a href="${CHAPTER_PATH}">${escapeXml(book.title)}</a></li>
      </ol>
    </nav>
  </body>
</html>
`;
}

function tocNcx(book: Book, identifier: string): string {
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
      <navLabel><text>${escapeXml(book.title)}</text></navLabel>
      <content src="${CHAPTER_PATH}"/>
    </navPoint>
  </navMap>
</ncx>
`;
}

function styleCss(style: Style, embeddedFont?: EmbeddedFont): string {
  const fontFace = embeddedFont
    ? `@font-face {
  font-family: '${embeddedFont.family}';
  font-weight: normal;
  font-style: normal;
  src: url(${FONT_PATH}) format('opentype');
}

`
    : '';
  return `@namespace epub "http://www.idpf.org/2007/ops";

${fontFace}html {
  font-size: ${style.fontSizePx}px;
}

body {
  font-family: ${style.fontFamily};
  line-height: ${style.lineHeight};
  margin: 0 ${style.marginRightEm}em 0 ${style.marginLeftEm}em;
}

h1.chapter-title {
  font-size: 1.4em;
  line-height: 1.4;
  margin: 1em 0;
  text-align: center;
}

p {
  margin: ${style.paragraphSpacingTopEm}em 0 ${style.paragraphSpacingBottomEm}em 0;
  text-indent: ${style.indentEm}em;
}

p.blank {
  text-indent: 0;
}

div.cover {
  margin: 0;
  padding: 0;
  text-align: center;
}

div.cover img {
  max-width: 100%;
  height: auto;
}
`;
}
