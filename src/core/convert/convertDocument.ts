import { type EmbeddedFont, buildEpub } from '../epub/buildEpub';
import { type Subsetter, usedCharacters } from '../fonts/subset';
import { uuid } from '../id';
import { resolveParser } from '../parse/registry';
import type { FileLike } from '../parse/types';
import { DEFAULT_REFLOW_OPTIONS, reflow, type ReflowOptions } from '../reflow/reflow';
import type { Book, Cover, Style } from '../types';
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
 * The conversion pipeline as a pure-ish function (its only impurity is a random
 * id and the current time): a Document plus settings in, EPUB bytes out. This
 * is the highest test seam — feed known inputs, unzip the result, assert.
 */
export async function convertDocument(
  file: FileLike,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const parsed = await resolveParser(file).parse(file);
  const book: Book = {
    id: uuid(),
    title: options.title?.trim() || parsed.suggestedTitle,
    author: options.author ?? '',
    language: options.language ?? 'ko',
    paragraphs: reflow(parsed.rawText, options.reflow ?? DEFAULT_REFLOW_OPTIONS),
    cover: options.cover ?? { kind: 'none' },
  };

  const embeddedFont = maybeEmbedFont(book, options.embedFont);
  const bytes = buildEpub(book, options.style ?? DEFAULT_STYLE, embeddedFont);
  return { fileName: `${safeFileName(book.title)}.epub`, bytes, title: book.title };
}

function maybeEmbedFont(book: Book, source: EmbedFontSource | undefined): EmbeddedFont | undefined {
  if (!source) return undefined;
  const text = usedCharacters([book.title, book.author, ...book.paragraphs]);
  const bytes = source.subsetter(source.sourceBytes, text);
  return { family: source.family, bytes };
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
