/**
 * Best-effort parser for the legacy binary `.hwp` format (HWP 5.x).
 *
 * `.hwp` is a proprietary CFB compound-binary container with no robust
 * open-source JS parser — complex documents may fail, and that is expected
 * The library is dynamically imported so it is never in the
 * initial bundle.
 *
 * Text extraction strategy:
 *   - Parse the CFB container with hwp.js.
 *   - Walk every Section → Paragraph → HWPChar, collecting only `Char`-typed
 *     characters (plain Unicode code points / strings).
 *   - Blank paragraphs are preserved as paragraph-boundary blank lines.
 *   - All other parse errors are wrapped in `HwpParseError` with a message
 *     suitable for display to non-developer users.
 */

import type { FileLike, ParsedDocument, Parser } from './types';
import { extensionOf, titleFromFileName } from './types';

/** Thrown when an `.hwp` file cannot be parsed (corrupt, unsupported, etc.). */
export class HwpParseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HwpParseError';
  }
}

/** `CharType.Char` is the enum value 0 in hwp.js. */
const CHAR_TYPE_CHAR = 0;

/**
 * Extract plain text from the parsed hwp.js `HWPDocument`.
 *
 * Uses duck-typed access so we do not pay for the full hwp.js type surface at
 * import time; the narrowest structural types are inlined here.
 */
function extractText(doc: HwpJsDocument): string {
  const paragraphLines: string[] = [];

  for (const section of doc.sections) {
    for (const paragraph of section.content) {
      let line = '';
      for (const char of paragraph.content) {
        if (char.type === CHAR_TYPE_CHAR && typeof char.value === 'string') {
          line += char.value;
        }
      }
      paragraphLines.push(line.trim());
    }
  }

  // Join paragraph lines with blank-line separators; collapse consecutive blank
  // lines to a single blank (mirrors what the EPUB writer expects from Reflow).
  return paragraphLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Minimal structural types for hwp.js output — avoids importing the full module
// type at the top level, keeping this file dependency-lazy.
// ---------------------------------------------------------------------------

interface HwpJsChar {
  readonly type: number;
  readonly value: number | string;
}

interface HwpJsParagraph {
  readonly content: readonly HwpJsChar[];
}

interface HwpJsSection {
  readonly content: readonly HwpJsParagraph[];
}

interface HwpJsDocument {
  readonly sections: readonly HwpJsSection[];
}

/** Structural shape of the dynamically-imported `hwp.js` module. */
interface HwpJsModule {
  /** The named export `parse` from hwp.js; accepts CFB$Blob (includes Uint8Array). */
  readonly parse: (input: Uint8Array) => HwpJsDocument;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export const hwpParser: Parser = {
  id: 'hwp',

  canParse: (file: FileLike): boolean => extensionOf(file.name) === 'hwp',

  parse: async (file: FileLike): Promise<ParsedDocument> => {
    // Dynamic import keeps the ~2 MB hwp.js bundle out of the initial chunk.
    // We use a loose intermediate type for the module because the mock used in
    // tests injects a plain object; hwp.js's declared types are structurally
    // compatible with HwpJsDocument so no cast is needed on the result.
    let mod: HwpJsModule;

    try {
      mod = await import('hwp.js');
    } catch (cause) {
      throw new HwpParseError(
        'The HWP reading tool could not be loaded. Try converting your file to a different format.',
        { cause },
      );
    }

    const parseFn: HwpJsModule['parse'] | undefined = mod.parse;
    if (typeof parseFn !== 'function') {
      throw new HwpParseError(
        'The HWP reading tool could not be loaded. Try converting your file to a different format.',
      );
    }

    let doc: HwpJsDocument;
    try {
      doc = parseFn(file.bytes);
    } catch (cause) {
      throw new HwpParseError(
        `"${file.name}" could not be read. The file may be damaged or use features that are not yet supported.`,
        { cause },
      );
    }

    const rawText = extractText(doc);

    return {
      rawText,
      suggestedTitle: titleFromFileName(file.name),
    };
  },
};
