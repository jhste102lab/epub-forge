import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FONT_ID, type FontId, fontOption } from '../../core/fonts/catalog';
import { DEFAULT_STYLE, type Style } from '../../core/types';
import { loadFont } from './fontLoader';

export interface Typography {
  readonly style: Style;
  readonly fontId: FontId;
  /** Select a font, keeping the EPUB CSS `font-family` in sync. */
  readonly setFont: (id: FontId) => void;
  /** Update one or more batch-wide Style values. */
  readonly patchStyle: (patch: Partial<Style>) => void;
}

/**
 * Batch-wide typography: the chosen font and the rest of the Style. Keeps only
 * the selected preview font loaded so the initial bundle stays light. Initial
 * values can be seeded (e.g. from a shared link).
 */
export function useTypography(
  initialStyle: Style = DEFAULT_STYLE,
  initialFontId: FontId = DEFAULT_FONT_ID,
): Typography {
  const [style, setStyle] = useState<Style>(initialStyle);
  const [fontId, setFontId] = useState<FontId>(initialFontId);

  useEffect(() => {
    void loadFont(fontId);
  }, [fontId]);

  const setFont = useCallback((id: FontId) => {
    setFontId(id);
    setStyle((prev) => ({ ...prev, fontFamily: fontOption(id).cssFamily }));
  }, []);

  const patchStyle = useCallback((patch: Partial<Style>) => {
    setStyle((prev) => ({ ...prev, ...patch }));
  }, []);

  return useMemo(
    () => ({ style, fontId, setFont, patchStyle }),
    [style, fontId, setFont, patchStyle],
  );
}
