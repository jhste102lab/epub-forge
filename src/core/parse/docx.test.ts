import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { docxParser } from './docx';
import type { FileLike } from './types';

/**
 * Builds a minimal valid `.docx` buffer containing the given paragraphs.
 *
 * A `.docx` is an OOXML ZIP whose required parts are:
 *   [Content_Types].xml  — content-type registry
 *   _rels/.rels          — top-level package relationships
 *   word/document.xml    — the document body
 *   word/_rels/document.xml.rels — document-level relationships (may be empty)
 */
function buildDocx(paragraphs: readonly string[]): Uint8Array {
  const wNs = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

  const wParagraphs = paragraphs
    .map((text) => `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`)
    .join('');

  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<w:document ${wNs}>`,
    `<w:body>${wParagraphs}</w:body>`,
    `</w:document>`,
  ].join('');

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '  <Default Extension="xml" ContentType="application/xml"/>',
    '  <Override PartName="/word/document.xml"',
    '    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join('');

  const relsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Id="rId1"',
    '    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"',
    '    Target="word/document.xml"/>',
    '</Relationships>',
  ].join('');

  const documentRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
  ].join('');

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(relsXml),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(documentRelsXml),
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeFile(name: string, bytes: Uint8Array): FileLike {
  return { name, bytes };
}

describe('docxParser.canParse', () => {
  it('claims .docx files', () => {
    expect(docxParser.canParse(makeFile('novel.docx', new Uint8Array()))).toBe(true);
  });

  it('rejects non-docx extensions', () => {
    expect(docxParser.canParse(makeFile('novel.txt', new Uint8Array()))).toBe(false);
    expect(docxParser.canParse(makeFile('novel.hwpx', new Uint8Array()))).toBe(false);
    expect(docxParser.canParse(makeFile('novel', new Uint8Array()))).toBe(false);
  });
});

describe('docxParser.parse', () => {
  it('derives the suggested Title from the filename without extension', async () => {
    const bytes = buildDocx(['Hello']);
    const result = await docxParser.parse(makeFile('My Novel.docx', bytes));
    expect(result.suggestedTitle).toBe('My Novel');
  });

  it('extracts text from a single paragraph', async () => {
    const bytes = buildDocx(['Hello, world!']);
    const result = await docxParser.parse(makeFile('test.docx', bytes));
    expect(result.rawText).toContain('Hello, world!');
  });

  it('separates multiple source paragraphs with blank lines', async () => {
    const paragraphs = ['First paragraph.', 'Second paragraph.', 'Third paragraph.'];
    const bytes = buildDocx(paragraphs);
    const result = await docxParser.parse(makeFile('chapters.docx', bytes));

    // mammoth appends \n\n after each paragraph element, yielding blank-line
    // boundaries that Reflow treats as hard paragraph breaks.
    expect(result.rawText).toContain('First paragraph.');
    expect(result.rawText).toContain('Second paragraph.');
    expect(result.rawText).toContain('Third paragraph.');

    // Blank-line separator is present between paragraphs
    expect(result.rawText).toMatch(/First paragraph\.\n\nSecond paragraph\./);
    expect(result.rawText).toMatch(/Second paragraph\.\n\nThird paragraph\./);
  });

  it('handles Korean text', async () => {
    const bytes = buildDocx(['첫 번째 문단입니다.', '두 번째 문단입니다.']);
    const result = await docxParser.parse(makeFile('한국어.docx', bytes));
    expect(result.rawText).toContain('첫 번째 문단입니다.');
    expect(result.rawText).toContain('두 번째 문단입니다.');
    expect(result.suggestedTitle).toBe('한국어');
  });
});
