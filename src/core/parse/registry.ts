import { docxParser } from './docx';
import { hwpParser } from './hwp';
import { hwpxParser } from './hwpx';
import { txtParser } from './txt';
import type { FileLike, Parser } from './types';
import { UnsupportedFormatError } from './types';

/**
 * Ordered list of registered parsers. Resolution is first-match-wins by
 * `canParse` (matched on the exact file extension, so `.hwpx` and `.hwp` do
 * not collide). Later slices append more parsers here.
 */
const PARSERS: readonly Parser[] = [txtParser, docxParser, hwpxParser, hwpParser];

export function resolveParser(file: FileLike): Parser {
  const parser = PARSERS.find((p) => p.canParse(file));
  if (!parser) throw new UnsupportedFormatError(file.name);
  return parser;
}

export function isSupported(file: FileLike): boolean {
  return PARSERS.some((p) => p.canParse(file));
}
