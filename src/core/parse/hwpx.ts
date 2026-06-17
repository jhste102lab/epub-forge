/**
 * Parser for the HWPX (OWPML) format.
 *
 * HWPX is a ZIP-based package where the body text lives in
 * `Contents/section0.xml`, `Contents/section1.xml`, etc.  Within each section
 * file, paragraphs are `<hp:p>` elements that contain `<hp:t>` text-run
 * elements (possibly nested inside `<hp:run>` and other wrapper elements).
 *
 * Extraction strategy (dependency-light):
 *   1. Unzip the package with `fflate`.
 *   2. Collect every `Contents/sectionN.xml` in numeric order.
 *   3. For each paragraph (`<hp:p>…</hp:p>`), concatenate the text of its
 *      `<hp:t>…</hp:t>` runs, then separate paragraphs with blank lines so
 *      that the Reflow engine treats them as paragraph boundaries.
 *   4. Decode the five XML entities (&amp; &lt; &gt; &quot; &apos;).
 */

import { strFromU8, unzipSync } from 'fflate';
import type { FileLike, ParsedDocument, Parser } from './types';
import { extensionOf, titleFromFileName } from './types';

// ---------------------------------------------------------------------------
// XML entity decoding
// ---------------------------------------------------------------------------

const ENTITY_MAP: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&([a-z]+);/g, (match, name: string) => ENTITY_MAP[name] ?? match);
}

// ---------------------------------------------------------------------------
// Text extraction from a single section XML string
// ---------------------------------------------------------------------------

/**
 * Extract paragraphs from one section XML.
 *
 * The approach: locate each `<hp:p>…</hp:p>` block, then within that block
 * collect every `<hp:t>…</hp:t>` run, stripping any nested tags inside the
 * run content.
 *
 * A CDATA section is not expected inside `<hp:t>` in real HWPX files, but we
 * handle it defensively by preserving its content verbatim after entity decode.
 */
function extractParagraphsFromSection(xml: string): string[] {
  const paragraphs: string[] = [];

  // Match each <hp:p>…</hp:p> block (non-greedy, dot-matches-newline via [\s\S])
  const pPattern = /<hp:p[\s>][\s\S]*?<\/hp:p>/g;

  for (const pMatch of xml.matchAll(pPattern)) {
    const pContent = pMatch[0];
    const runParts: string[] = [];

    // Collect every <hp:t>…</hp:t> run within this paragraph
    const tPattern = /<hp:t(?:\s[^>]*)?>(<!\[CDATA\[[\s\S]*?]]>|[\s\S]*?)<\/hp:t>/g;

    for (const tMatch of pContent.matchAll(tPattern)) {
      const inner = tMatch[1];
      let text: string;

      if (inner.startsWith('<![CDATA[')) {
        // Preserve CDATA content as-is (no entity substitution needed)
        text = inner.slice(9, inner.lastIndexOf(']]>'));
      } else {
        // Strip any nested XML tags, then decode entities
        text = decodeEntities(inner.replace(/<[^>]+>/g, ''));
      }

      if (text.length > 0) {
        runParts.push(text);
      }
    }

    paragraphs.push(runParts.join(''));
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

/**
 * Return the numeric index embedded in a path like `Contents/section3.xml`.
 * Returns -1 for paths that don't match the pattern (they are sorted last).
 */
function sectionIndex(path: string): number {
  const m = /Contents\/section(\d+)\.xml$/i.exec(path);
  return m !== null ? parseInt(m[1], 10) : -1;
}

// ---------------------------------------------------------------------------
// Parser implementation
// ---------------------------------------------------------------------------

export const hwpxParser: Parser = {
  id: 'hwpx',

  canParse: (file: FileLike): boolean => extensionOf(file.name) === 'hwpx',

  parse: (file: FileLike): Promise<ParsedDocument> => {
    const files = unzipSync(file.bytes);

    // Collect all Contents/sectionN.xml paths in ascending numeric order
    const sectionPaths = Object.keys(files)
      .filter((p) => sectionIndex(p) >= 0)
      .sort((a, b) => sectionIndex(a) - sectionIndex(b));

    const allParagraphs: string[] = [];

    for (const path of sectionPaths) {
      const xml = strFromU8(files[path]);
      const paragraphs = extractParagraphsFromSection(xml);
      allParagraphs.push(...paragraphs);
    }

    // Separate paragraphs with blank lines so Reflow sees them as boundaries
    const rawText = allParagraphs.join('\n\n');

    return Promise.resolve({
      rawText,
      suggestedTitle: titleFromFileName(file.name),
    });
  },
};
