import { readFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { beforeAll, describe, expect, it } from 'vitest';
import { convertDocument } from '../convert/convertDocument';
import type { FileLike } from '../parse/types';
import { createSubsetter, type Subsetter, usedCharacters } from './subset';

const readBin = (path: string): Uint8Array => new Uint8Array(readFileSync(path));
const readArrayBuffer = (path: string): ArrayBuffer => {
  const source = readFileSync(path);
  const buffer = new ArrayBuffer(source.byteLength);
  new Uint8Array(buffer).set(source);
  return buffer;
};
const SERIF = 'public/fonts/noto-serif-kr.otf';

let subsetter: Subsetter;
beforeAll(async () => {
  subsetter = await createSubsetter(readArrayBuffer('node_modules/harfbuzzjs/hb-subset.wasm'));
});

function isSfnt(bytes: Uint8Array): boolean {
  const sig = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return sig === 0x4f54544f || sig === 0x00010000 || sig === 0x74727565;
}

describe('usedCharacters', () => {
  it('collects unique characters plus common punctuation', () => {
    const chars = usedCharacters(['가나', '나다']);
    expect(chars).toContain('가');
    expect(chars).toContain('다');
    expect(chars).toContain('.');
    expect([...chars].filter((c) => c === '나')).toHaveLength(1);
  });
});

describe('createSubsetter', () => {
  it('shrinks a CJK font drastically for a small glyph set', () => {
    const source = readBin(SERIF);
    const sub = subsetter(source, usedCharacters(['가나다라마바사 ABC.']));
    expect(isSfnt(sub)).toBe(true);
    expect(sub.byteLength).toBeLessThan(source.byteLength / 10);
  });
});

describe('convertDocument with font embedding', () => {
  it('embeds a sub-megabyte subset for a Korean Book', async () => {
    const file: FileLike = {
      name: '소설.txt',
      bytes: new TextEncoder().encode('한국어 본문입니다.\n\n두 번째 문단도 있습니다.'),
    };
    const result = await convertDocument(file, {
      embedFont: { family: 'Noto Serif KR', sourceBytes: readBin(SERIF), subsetter },
    });

    const archive = unzipSync(result.bytes);
    const embedded = archive['OEBPS/fonts/body.otf'];
    expect(embedded).toBeDefined();
    expect(isSfnt(embedded)).toBe(true);
    expect(embedded.byteLength).toBeLessThan(1_000_000);
    expect(strFromU8(archive['OEBPS/style.css'])).toContain("font-family: 'Noto Serif KR'");
  });
});
