import type { FileLike, Parser, ParsedDocument } from './types';
import { extensionOf, titleFromFileName } from './types';

/**
 * Decode arbitrary text bytes. Honors a UTF-8/UTF-16 BOM, then tries strict
 * UTF-8, and finally falls back to EUC-KR/CP949 — the common legacy encoding
 * for older Korean `.txt` files.
 */
export function decodeText(bytes: Uint8Array): string {
  if (hasUtf8Bom(bytes)) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (hasUtf16Bom(bytes, 0xff, 0xfe)) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (hasUtf16Bom(bytes, 0xfe, 0xff)) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('euc-kr').decode(bytes);
  }
}

function hasUtf8Bom(b: Uint8Array): boolean {
  return b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
}

function hasUtf16Bom(b: Uint8Array, b0: number, b1: number): boolean {
  return b.length >= 2 && b[0] === b0 && b[1] === b1;
}

export const txtParser: Parser = {
  id: 'txt',
  canParse: (file: FileLike) => extensionOf(file.name) === 'txt',
  parse: (file: FileLike): Promise<ParsedDocument> =>
    Promise.resolve({
      rawText: normalizeNewlines(decodeText(file.bytes)),
      suggestedTitle: titleFromFileName(file.name),
    }),
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}
