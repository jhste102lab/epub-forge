import { describe, expect, it } from 'vitest';
import { decodeText, txtParser } from './txt';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('decodeText', () => {
  it('decodes plain UTF-8', () => {
    expect(decodeText(utf8('가나다 abc'))).toBe('가나다 abc');
  });

  it('strips a UTF-8 BOM', () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('한글')]);
    expect(decodeText(withBom)).toBe('한글');
  });

  it('falls back to EUC-KR for legacy bytes that are invalid UTF-8', () => {
    // '가' in EUC-KR / CP949 is 0xB0 0xA1, which is not valid UTF-8.
    expect(decodeText(new Uint8Array([0xb0, 0xa1]))).toBe('가');
  });
});

describe('txtParser', () => {
  it('claims .txt files only', () => {
    expect(txtParser.canParse({ name: 'a.txt', bytes: new Uint8Array() })).toBe(true);
    expect(txtParser.canParse({ name: 'a.docx', bytes: new Uint8Array() })).toBe(false);
  });

  it('derives the suggested Title from the filename and normalizes newlines', async () => {
    const parsed = await txtParser.parse({ name: '제목.txt', bytes: utf8('a\r\nb\rc') });
    expect(parsed.suggestedTitle).toBe('제목');
    expect(parsed.rawText).toBe('a\nb\nc');
  });
});
