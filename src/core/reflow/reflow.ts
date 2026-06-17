/**
 * Reflow: re-join hard-wrapped lines back into whole paragraphs.
 *
 * Rule (confirmed with the maintainer): a line is joined to the next unless its
 * last non-space character is a Terminator, in which case it ends the paragraph.
 * Blank lines are preserved as paragraph boundaries — and kept in the output as
 * empty paragraphs so the author's vertical spacing survives.
 *
 * Output is a flat `string[]`; an empty string denotes a preserved blank line.
 * Pure and framework-agnostic.
 */

/** Characters that end a paragraph when they are the last on a line. */
export const DEFAULT_TERMINATORS = ['.', '!', '?', "'", '"', ')', ']', '>', '”', '’'].join('');

export interface ReflowOptions {
  /** When false, every source line becomes its own paragraph (no joining). */
  readonly enabled: boolean;
  /** The set of Terminator characters, as a string. */
  readonly terminators: string;
  /** Insert a space between joined lines (restores spaces lost at wrap points). */
  readonly joinWithSpace: boolean;
}

export const DEFAULT_REFLOW_OPTIONS: ReflowOptions = {
  enabled: true,
  terminators: DEFAULT_TERMINATORS,
  joinWithSpace: true,
};

export function reflow(rawText: string, options: ReflowOptions): string[] {
  const lines = rawText.replace(/\r\n?/g, '\n').split('\n');
  const terminators = new Set([...options.terminators]);
  const paragraphs: string[] = [];

  let buffer = '';
  const flush = (): void => {
    if (buffer.length > 0) {
      paragraphs.push(buffer);
      buffer = '';
    }
  };

  for (const line of lines) {
    if (line.trim().length === 0) {
      flush();
      paragraphs.push(''); // preserved blank line
      continue;
    }

    const piece = line.trim();

    if (!options.enabled) {
      paragraphs.push(piece);
      continue;
    }

    buffer = buffer.length === 0 ? piece : buffer + (options.joinWithSpace ? ' ' : '') + piece;

    const lastChar = piece.at(-1);
    if (lastChar !== undefined && terminators.has(lastChar)) {
      flush();
    }
  }
  flush();

  return trimBlankEdges(paragraphs);
}

/** Drop leading and trailing blank paragraphs, keeping internal ones. */
function trimBlankEdges(paragraphs: readonly string[]): string[] {
  let start = 0;
  let end = paragraphs.length;
  while (start < end && paragraphs[start] === '') start += 1;
  while (end > start && paragraphs[end - 1] === '') end -= 1;
  return paragraphs.slice(start, end);
}
