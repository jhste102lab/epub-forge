import { describe, expect, it } from 'vitest';
import { DEFAULT_FONT_ID, FONT_OPTIONS, fontOption } from './catalog';

describe('font catalog', () => {
  it('exposes a non-empty curated set with unique ids', () => {
    expect(FONT_OPTIONS.length).toBeGreaterThan(0);
    const ids = FONT_OPTIONS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a resolvable default font', () => {
    expect(fontOption(DEFAULT_FONT_ID).cssFamily).toContain('Noto Serif KR');
  });

  it('every option carries a quoted family name and source asset', () => {
    for (const option of FONT_OPTIONS) {
      expect(option.cssFamily).toMatch(/'.+'/);
      expect(option.assetPath).toMatch(/\.otf$/);
    }
  });
});
