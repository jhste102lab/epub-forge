/**
 * The parse seam. Each input format is handled by one Parser registered in the
 * registry; adding a format is adding a Parser and nothing else. Parsers are
 * DOM-independent: the UI reads a File into a `FileLike` before calling them.
 */

/** A document's bytes plus its name, decoupled from the browser `File` type. */
export interface FileLike {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** The result of parsing a Document: raw text before Reflow, plus a Title hint. */
export interface ParsedDocument {
  /** Extracted text exactly as found, before Reflow is applied. */
  readonly rawText: string;
  /** Title suggested from the source (typically the filename without extension). */
  readonly suggestedTitle: string;
}

export interface Parser {
  /** Stable identifier, also used as the worker/log label. */
  readonly id: string;
  /** Whether this parser claims the given file (by extension and/or signature). */
  canParse(file: FileLike): boolean;
  parse(file: FileLike): Promise<ParsedDocument>;
}

/** Thrown when no registered Parser claims a file. */
export class UnsupportedFormatError extends Error {
  constructor(public readonly fileName: string) {
    super(`No parser can handle "${fileName}"`);
    this.name = 'UnsupportedFormatError';
  }
}

/** Strip the directory and the final extension from a filename. */
export function titleFromFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  return (dot > 0 ? base.slice(0, dot) : base).trim() || base;
}

/** Lowercased file extension without the dot, or '' if none. */
export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}
