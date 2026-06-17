/**
 * Tests for the best-effort `.hwp` parser.
 *
 * Happy-path coverage note
 * ========================
 * A full happy-path test (valid `.hwp` → extracted text) requires a real HWP
 * binary fixture, which cannot be synthesised from scratch in pure JS without
 * a full CFB + HWP5 serialiser. No such fixture is checked into this repo.
 *
 * The `extractText` unit tests below cover the text-extraction logic using a
 * hand-crafted mock that mirrors the exact shape hwp.js returns, giving high
 * confidence that the logic is correct once a real file is parsed.
 *
 * To add end-to-end happy-path coverage: place a small real `.hwp` file at
 * `src/core/parse/__fixtures__/sample.hwp` and uncomment the fixture test at
 * the bottom of this file.
 */

import { describe, expect, it, vi } from 'vitest';
import { HwpParseError, hwpParser } from './hwp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, bytes: Uint8Array): { name: string; bytes: Uint8Array } {
  return { name, bytes };
}

// Minimal mock shape that mirrors the hwp.js HWPDocument structure.
// `paragraphs` is a flat list of paragraph texts for a single section; an
// empty string represents a blank (empty) paragraph.
function mockDoc(paragraphs: readonly string[]): object {
  return {
    sections: [
      {
        content: paragraphs.map((text) => ({
          content: Array.from(text).map((ch) => ({
            type: 0 /* CharType.Char */,
            value: ch,
          })),
        })),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// canParse
// ---------------------------------------------------------------------------

describe('hwpParser.canParse', () => {
  it('claims .hwp files', () => {
    expect(hwpParser.canParse(makeFile('novel.hwp', new Uint8Array()))).toBe(true);
  });

  it('is case-insensitive on the extension', () => {
    expect(hwpParser.canParse(makeFile('novel.HWP', new Uint8Array()))).toBe(true);
  });

  it('does not claim .hwpx files', () => {
    expect(hwpParser.canParse(makeFile('novel.hwpx', new Uint8Array()))).toBe(false);
  });

  it('does not claim .txt files', () => {
    expect(hwpParser.canParse(makeFile('novel.txt', new Uint8Array()))).toBe(false);
  });

  it('does not claim files with no extension', () => {
    expect(hwpParser.canParse(makeFile('novel', new Uint8Array()))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Graceful-failure path (no real .hwp needed)
// ---------------------------------------------------------------------------

describe('hwpParser.parse — graceful failure', () => {
  it('throws HwpParseError (not a generic Error) when given random garbage bytes', async () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xab, 0xcd]);
    await expect(hwpParser.parse(makeFile('bad.hwp', garbage))).rejects.toBeInstanceOf(
      HwpParseError,
    );
  });

  it('includes the filename in the error message when bytes are invalid', async () => {
    const garbage = new Uint8Array(32).fill(0xaa);
    try {
      await hwpParser.parse(makeFile('mybook.hwp', garbage));
      throw new Error('Expected HwpParseError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HwpParseError);
      expect((err as HwpParseError).message).toContain('mybook.hwp');
    }
  });

  it('sets the correct error name', async () => {
    const garbage = new Uint8Array(16).fill(0x00);
    try {
      await hwpParser.parse(makeFile('corrupt.hwp', garbage));
      throw new Error('Expected HwpParseError to be thrown');
    } catch (err) {
      expect((err as Error).name).toBe('HwpParseError');
    }
  });

  it('never throws a raw Error or TypeError for garbage bytes', async () => {
    const garbage = new Uint8Array(8).fill(0x13);
    try {
      await hwpParser.parse(makeFile('corrupt.hwp', garbage));
    } catch (err) {
      // Whatever is thrown must be an HwpParseError — never a raw TypeError,
      // RangeError, or other unexpected class.
      expect(err).toBeInstanceOf(HwpParseError);
    }
  });

  it('does not crash or hang on empty bytes', async () => {
    await expect(hwpParser.parse(makeFile('empty.hwp', new Uint8Array(0)))).rejects.toBeInstanceOf(
      HwpParseError,
    );
  });
});

// ---------------------------------------------------------------------------
// HwpParseError class contract
// ---------------------------------------------------------------------------

describe('HwpParseError', () => {
  it('is an instance of Error', () => {
    const err = new HwpParseError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    expect(new HwpParseError('test').name).toBe('HwpParseError');
  });

  it('preserves the message', () => {
    expect(new HwpParseError('something went wrong').message).toBe('something went wrong');
  });

  it('forwards a cause when supplied', () => {
    const cause = new TypeError('inner');
    const err = new HwpParseError('outer', { cause });
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// Text extraction logic (unit-tested via mock)
//
// These tests bypass the dynamic hwp.js import by mocking the module and
// confirming that extractText produces the expected output shape.
// ---------------------------------------------------------------------------

describe('hwpParser.parse — text extraction via mock', () => {
  it('joins characters into paragraph text separated by newlines', async () => {
    vi.doMock('hwp.js', () => ({
      parse: () => mockDoc(['안녕하세요', '세계']),
    }));

    // Re-import *after* mock is set up so the dynamic import picks it up.
    const { hwpParser: freshParser } = await import('./hwp');
    const result = await freshParser.parse(makeFile('test.hwp', new Uint8Array([0x01])));

    expect(result.rawText).toContain('안녕하세요');
    expect(result.rawText).toContain('세계');
    vi.doUnmock('hwp.js');
  });

  it('derives suggestedTitle from the filename', async () => {
    vi.doMock('hwp.js', () => ({
      parse: () => mockDoc(['내용']),
    }));

    const { hwpParser: freshParser } = await import('./hwp');
    const result = await freshParser.parse(makeFile('나의 소설.hwp', new Uint8Array([0x01])));

    expect(result.suggestedTitle).toBe('나의 소설');
    vi.doUnmock('hwp.js');
  });

  it('handles blank paragraphs without crashing', async () => {
    vi.doMock('hwp.js', () => ({
      parse: () => mockDoc(['첫 번째', '', '세 번째']),
    }));

    const { hwpParser: freshParser } = await import('./hwp');
    const result = await freshParser.parse(makeFile('test.hwp', new Uint8Array([0x01])));

    expect(result.rawText).toContain('첫 번째');
    expect(result.rawText).toContain('세 번째');
    vi.doUnmock('hwp.js');
  });

  it('does not produce more than one consecutive blank line', async () => {
    vi.doMock('hwp.js', () => ({
      parse: () => mockDoc(['A', '', '', '', 'B']),
    }));

    const { hwpParser: freshParser } = await import('./hwp');
    const result = await freshParser.parse(makeFile('test.hwp', new Uint8Array([0x01])));

    expect(result.rawText).not.toMatch(/\n{3,}/);
    vi.doUnmock('hwp.js');
  });
});

// ---------------------------------------------------------------------------
// Registry integration
// ---------------------------------------------------------------------------

describe('registry integration', () => {
  it('hwpParser.id is "hwp"', () => {
    expect(hwpParser.id).toBe('hwp');
  });
});

// ---------------------------------------------------------------------------
// Happy-path fixture test (requires a real .hwp file)
// ---------------------------------------------------------------------------
//
// To enable: place a valid HWP 5.x file at the path below and uncomment.
//
// import { readFileSync } from 'node:fs';
// import { resolve } from 'node:path';
//
// describe('hwpParser.parse — real fixture', () => {
//   it('extracts non-empty text from a real .hwp file', async () => {
//     const bytes = new Uint8Array(
//       readFileSync(resolve(__dirname, '__fixtures__/sample.hwp')),
//     );
//     const result = await hwpParser.parse(makeFile('sample.hwp', bytes));
//     expect(result.rawText.length).toBeGreaterThan(0);
//     expect(result.suggestedTitle).toBe('sample');
//   });
// });
