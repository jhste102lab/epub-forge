import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { hwpxParser } from './hwpx';
import type { FileLike } from './types';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSection(paragraphs: string[]): string {
  const pElements = paragraphs
    .map((text) => `<hp:p><hp:run><hp:t>${text}</hp:t></hp:run></hp:p>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<hpf:HWPFDocument xmlns:hpf="urn:schemas-microsoft-com:office:word"
                  xmlns:hp="http://www.hancom.co.kr/hwpml/2012/paragraph">
  <hp:body>
    <hp:section>
${pElements}
    </hp:section>
  </hp:body>
</hpf:HWPFDocument>`;
}

/**
 * Build a minimal HWPX ZIP fixture (in-memory).
 *
 * Real HWPX packages include many metadata files, but our parser only reads
 * `Contents/sectionN.xml` entries, so the other files can be stubs.
 */
function buildHwpx(sections: string[][]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};

  for (let i = 0; i < sections.length; i++) {
    entries[`Contents/section${String(i)}.xml`] = strToU8(makeSection(sections[i]));
  }

  // Stub required structural files (content ignored by our parser)
  entries['mimetype'] = strToU8('application/hwp+zip');
  entries['META-INF/container.xml'] = strToU8('<container/>');

  return zipSync(entries);
}

function makeFile(name: string, bytes: Uint8Array): FileLike {
  return { name, bytes };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hwpxParser', () => {
  describe('canParse', () => {
    it('claims .hwpx files', () => {
      const file = makeFile('chapter1.hwpx', new Uint8Array());
      expect(hwpxParser.canParse(file)).toBe(true);
    });

    it('does not claim .txt files', () => {
      const file = makeFile('chapter1.txt', new Uint8Array());
      expect(hwpxParser.canParse(file)).toBe(false);
    });

    it('does not claim .hwp files', () => {
      const file = makeFile('chapter1.hwp', new Uint8Array());
      expect(hwpxParser.canParse(file)).toBe(false);
    });

    it('is case-insensitive for extension', () => {
      const file = makeFile('chapter1.HWPX', new Uint8Array());
      expect(hwpxParser.canParse(file)).toBe(true);
    });
  });

  describe('parse', () => {
    it('extracts text from a single section', async () => {
      const bytes = buildHwpx([['첫 번째 단락', '두 번째 단락']]);
      const result = await hwpxParser.parse(makeFile('소설.hwpx', bytes));

      expect(result.rawText).toBe('첫 번째 단락\n\n두 번째 단락');
    });

    it('derives the suggestedTitle from the filename', async () => {
      const bytes = buildHwpx([['내용']]);
      const result = await hwpxParser.parse(makeFile('내 소설 제목.hwpx', bytes));

      expect(result.suggestedTitle).toBe('내 소설 제목');
    });

    it('concatenates runs within a paragraph', async () => {
      // Two <hp:t> runs inside one <hp:p>
      const sectionXml = `<?xml version="1.0" encoding="UTF-8"?>
<hpf:HWPFDocument xmlns:hpf="urn:schemas-microsoft-com:office:word"
                  xmlns:hp="http://www.hancom.co.kr/hwpml/2012/paragraph">
  <hp:body>
    <hp:section>
      <hp:p>
        <hp:run><hp:t>안녕</hp:t></hp:run>
        <hp:run><hp:t>하세요</hp:t></hp:run>
      </hp:p>
    </hp:section>
  </hp:body>
</hpf:HWPFDocument>`;

      const bytes = zipSync({
        'Contents/section0.xml': strToU8(sectionXml),
      });

      const result = await hwpxParser.parse(makeFile('test.hwpx', bytes));
      expect(result.rawText).toBe('안녕하세요');
    });

    it('decodes XML entities', async () => {
      const sectionXml = `<?xml version="1.0" encoding="UTF-8"?>
<hpf:HWPFDocument xmlns:hpf="urn:schemas-microsoft-com:office:word"
                  xmlns:hp="http://www.hancom.co.kr/hwpml/2012/paragraph">
  <hp:body>
    <hp:section>
      <hp:p><hp:run><hp:t>A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;</hp:t></hp:run></hp:p>
    </hp:section>
  </hp:body>
</hpf:HWPFDocument>`;

      const bytes = zipSync({
        'Contents/section0.xml': strToU8(sectionXml),
      });

      const result = await hwpxParser.parse(makeFile('entities.hwpx', bytes));
      expect(result.rawText).toBe(`A & B < C > D "E" 'F'`);
    });

    it('merges multiple sections in numeric order', async () => {
      // section1 before section0 in the entries map — parser must sort by index
      const bytes = zipSync({
        'Contents/section1.xml': strToU8(makeSection(['두 번째 섹션'])),
        'Contents/section0.xml': strToU8(makeSection(['첫 번째 섹션'])),
      });

      const result = await hwpxParser.parse(makeFile('multi.hwpx', bytes));
      expect(result.rawText).toBe('첫 번째 섹션\n\n두 번째 섹션');
    });

    it('strips nested tags inside <hp:t> runs', async () => {
      // Some HWPX files embed inline formatting tags inside <hp:t>
      const sectionXml = `<?xml version="1.0" encoding="UTF-8"?>
<hpf:HWPFDocument xmlns:hpf="urn:schemas-microsoft-com:office:word"
                  xmlns:hp="http://www.hancom.co.kr/hwpml/2012/paragraph">
  <hp:body>
    <hp:section>
      <hp:p><hp:run><hp:t><hp:bold>굵은</hp:bold> 글씨</hp:t></hp:run></hp:p>
    </hp:section>
  </hp:body>
</hpf:HWPFDocument>`;

      const bytes = zipSync({
        'Contents/section0.xml': strToU8(sectionXml),
      });

      const result = await hwpxParser.parse(makeFile('nested.hwpx', bytes));
      expect(result.rawText).toBe('굵은 글씨');
    });

    it('produces an empty rawText for a document with no paragraphs', async () => {
      const sectionXml = `<?xml version="1.0" encoding="UTF-8"?>
<hpf:HWPFDocument xmlns:hpf="urn:schemas-microsoft-com:office:word"
                  xmlns:hp="http://www.hancom.co.kr/hwpml/2012/paragraph">
  <hp:body><hp:section></hp:section></hp:body>
</hpf:HWPFDocument>`;

      const bytes = zipSync({
        'Contents/section0.xml': strToU8(sectionXml),
      });

      const result = await hwpxParser.parse(makeFile('empty.hwpx', bytes));
      expect(result.rawText).toBe('');
    });
  });
});
