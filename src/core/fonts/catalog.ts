/**
 * The curated font set offered to users (single-select). Each entry pairs a
 * human display name with the CSS `font-family` written into the EPUB. All are
 * free for commercial use. The web preview loads the selected font lazily; the
 * subsetting/embedding of the actual file into the EPUB is a later slice.
 *
 * 리디바탕(RIDIBatang) joins once the self-hosted font pipeline lands.
 */

export type FontId = 'noto-serif-kr' | 'noto-sans-kr' | 'pretendard' | 'ridibatang';

export interface FontOption {
  readonly id: FontId;
  /** The `font-family` stack used in the EPUB CSS and the live preview. */
  readonly cssFamily: string;
  /** Bare family name written into the embedded `@font-face`. */
  readonly family: string;
  /** Path (relative to the app base) of the full source woff2 to subset from. */
  readonly assetPath: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  {
    id: 'noto-serif-kr',
    cssFamily: "'Noto Serif KR', serif",
    family: 'Noto Serif KR',
    assetPath: 'fonts/noto-serif-kr.otf',
  },
  {
    id: 'noto-sans-kr',
    cssFamily: "'Noto Sans KR', sans-serif",
    family: 'Noto Sans KR',
    assetPath: 'fonts/noto-sans-kr.otf',
  },
  {
    id: 'pretendard',
    cssFamily: "'Pretendard', sans-serif",
    family: 'Pretendard',
    assetPath: 'fonts/pretendard.otf',
  },
  {
    id: 'ridibatang',
    cssFamily: "'RIDIBatang', serif",
    family: 'RIDIBatang',
    assetPath: 'fonts/ridibatang.otf',
  },
];

export const DEFAULT_FONT_ID: FontId = 'noto-serif-kr';

export function fontOption(id: FontId): FontOption {
  const found = FONT_OPTIONS.find((f) => f.id === id);
  if (!found) throw new Error(`Unknown font id: ${id}`);
  return found;
}
