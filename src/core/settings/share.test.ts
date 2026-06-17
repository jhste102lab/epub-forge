import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_ID, fontOption } from '../fonts/catalog';
import { DEFAULT_REFLOW_OPTIONS } from '../reflow/reflow';
import { DEFAULT_STYLE } from '../types';
import { decodeSettings, encodeSettings, type ShareableSettings } from './share';

const FALLBACK: ShareableSettings = {
  reflow: DEFAULT_REFLOW_OPTIONS,
  style: DEFAULT_STYLE,
  fontId: DEFAULT_FONT_ID,
};

const CUSTOM: ShareableSettings = {
  fontId: 'pretendard',
  reflow: { enabled: true, terminators: '.!?', joinWithSpace: false },
  style: {
    fontFamily: fontOption('pretendard').cssFamily,
    fontSizePx: 22,
    lineHeight: 2,
    marginLeftEm: 2,
    marginRightEm: 1.5,
    paragraphSpacingTopEm: 0.4,
    paragraphSpacingBottomEm: 0.8,
    indentEm: 0,
  },
};

describe('encode/decode settings', () => {
  it('round-trips custom settings exactly', () => {
    expect(decodeSettings(encodeSettings(CUSTOM), FALLBACK)).toEqual(CUSTOM);
  });

  it('produces a URL-safe string (no +, /, =)', () => {
    expect(encodeSettings(CUSTOM)).not.toMatch(/[+/=]/);
  });

  it('derives the font family from the font id, not the stored style', () => {
    const decoded = decodeSettings(encodeSettings(CUSTOM), FALLBACK);
    expect(decoded.style.fontFamily).toBe(fontOption('pretendard').cssFamily);
  });

  it('falls back on garbage input', () => {
    expect(decodeSettings('not-valid-base64!!', FALLBACK)).toBe(FALLBACK);
    expect(decodeSettings(btoa('{"v":1'), FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when the version does not match', () => {
    const future = encodeSettings(CUSTOM).length > 0 ? btoaUrl('{"v":99}') : '';
    expect(decodeSettings(future, FALLBACK)).toBe(FALLBACK);
  });

  it('clamps out-of-range numbers and rejects unknown fonts', () => {
    const decoded = decodeSettings(
      btoaUrl(JSON.stringify({ v: 1, f: 'comic-sans', s: { fs: 9999, lh: -5 } })),
      FALLBACK,
    );
    expect(decoded.fontId).toBe(FALLBACK.fontId);
    expect(decoded.style.fontSizePx).toBe(28); // clamped to max
    expect(decoded.style.lineHeight).toBe(1.2); // clamped to min
  });

  it('caps an over-long terminator string', () => {
    const decoded = decodeSettings(
      btoaUrl(JSON.stringify({ v: 1, r: { t: 'x'.repeat(500) } })),
      FALLBACK,
    );
    expect(decoded.reflow.terminators.length).toBeLessThanOrEqual(100);
  });
});

function btoaUrl(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
