import { type EmbeddedFont, buildEpub } from '../epub/buildEpub';
import { type Subsetter, usedCharacters } from '../fonts/subset';
import { uuid } from '../id';
import { readImageZip } from '../intake/expandZip';
import { resolveParser } from '../parse/registry';
import { titleFromFileName } from '../parse/types';
import { DEFAULT_REFLOW_OPTIONS, reflow, type ReflowOptions } from '../reflow/reflow';
import type { Book, BookBody, BookSource, Cover, ImagePage, Style } from '../types';
import { DEFAULT_STYLE } from '../types';

/**
 * The selected font's source plus a subsetter. The subsetter is injected so the
 * env-specific harfbuzz wasm loading stays out of this pure core module.
 */
export interface EmbedFontSource {
  readonly family: string;
  readonly sourceBytes: Uint8Array;
  readonly subsetter: Subsetter;
}

/** Per-Book overrides the caller may supply; anything omitted is derived. */
export interface ConvertOptions {
  readonly title?: string;
  readonly author?: string;
  readonly tocTitle?: string;
  readonly language?: string;
  readonly cover?: Cover;
  readonly style?: Style;
  readonly reflow?: ReflowOptions;
  readonly embedFont?: EmbedFontSource;
}

export interface ConvertResult {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  readonly title: string;
}

/**
 * One source plus settings in, EPUB bytes out. Image archives are decoded on
 * the worker solely for validation. All image bodies keep their original bytes
 * and resolution and skip reflow and font subsetting.
 */
export async function convertDocument(
  file: BookSource,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  let body: BookBody;
  let suggestedTitle: string;
  if (file.kind === 'image-zip') {
    body = { kind: 'images', pages: await imagePages(file) };
    suggestedTitle = titleFromFileName(file.name);
  } else {
    const parsed = await resolveParser(file).parse(file);
    body = {
      kind: 'text',
      paragraphs: reflow(parsed.rawText, options.reflow ?? DEFAULT_REFLOW_OPTIONS),
    };
    suggestedTitle = parsed.suggestedTitle;
  }
  const tocTitle = options.tocTitle?.trim();
  const book: Book = {
    id: uuid(),
    title: options.title?.trim() || suggestedTitle,
    author: options.author ?? '',
    ...(tocTitle ? { tocTitle } : {}),
    language: options.language ?? 'ko',
    body,
    cover: options.cover ?? { kind: 'none' },
  };

  const embeddedFont = maybeEmbedFont(book, options.embedFont);
  const bytes = buildEpub(book, options.style ?? DEFAULT_STYLE, embeddedFont);
  return { fileName: `${safeFileName(book.title)}.epub`, bytes, title: book.title };
}

function maybeEmbedFont(book: Book, source: EmbedFontSource | undefined): EmbeddedFont | undefined {
  if (!source || book.body.kind !== 'text') return undefined;
  const text = usedCharacters([book.title, book.author, ...book.body.paragraphs]);
  const bytes = source.subsetter(source.sourceBytes, text);
  return { family: source.family, bytes };
}

async function imagePages(file: BookSource): Promise<ImagePage[]> {
  const pages = readImageZip(file);
  for (const page of pages) {
    let bitmap: ImageBitmap | undefined;
    try {
      // Decode only to reject corrupt pages; the EPUB keeps the source bytes.
      bitmap = await createImageBitmap(
        new Blob([page.bytes as Uint8Array<ArrayBuffer>], { type: page.mediaType }),
      );
      if (bitmap.width === 0 || bitmap.height === 0) throw new Error('Empty image');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid image page "${page.sourcePath}" in "${file.name}": ${reason}`);
    } finally {
      bitmap?.close();
    }
  }
  return pages;
}

const INVALID_FILENAME_CHARS = /["*/:<>?\\|]/g;

/** Make a Title safe to use as a download filename across platforms. */
export function safeFileName(title: string): string {
  const cleaned = title
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[ .]+$/, '');
  return cleaned.length > 0 ? cleaned : 'book';
}
