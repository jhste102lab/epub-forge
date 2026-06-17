import type { FileLike, Parser, ParsedDocument } from './types';
import { extensionOf, titleFromFileName } from './types';

/**
 * Parser for `.docx` Documents. Uses mammoth via dynamic import so it stays
 * out of the initial bundle and loads only when a docx file is parsed.
 *
 * mammoth's `extractRawText` joins paragraph children and appends `\n\n` after
 * each paragraph element, which gives us blank-line-separated paragraphs —
 * exactly the format Reflow expects as paragraph boundaries.
 */
export const docxParser: Parser = {
  id: 'docx',

  canParse: (file: FileLike): boolean => extensionOf(file.name) === 'docx',

  parse: async (file: FileLike): Promise<ParsedDocument> => {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({
      arrayBuffer: file.bytes.buffer as ArrayBuffer,
    });
    const rawText = result.value.replace(/\r\n?/g, '\n').trimEnd();
    return {
      rawText,
      suggestedTitle: titleFromFileName(file.name),
    };
  },
};
