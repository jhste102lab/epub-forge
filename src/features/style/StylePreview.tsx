import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FontId } from '../../core/fonts/catalog';
import type { Style } from '../../core/types';

interface StylePreviewProps {
  readonly style: Style;
  readonly fontId: FontId;
}

/**
 * Live preview of how a Book will read under the current Style. Mirrors the
 * EPUB CSS (font, size, line height, margins, paragraph spacing, indent) and
 * shows the selected font's name and size so the user can judge readability.
 */
export function StylePreview({ style, fontId }: StylePreviewProps): JSX.Element {
  const { t } = useTranslation();
  const paragraphs = t('preview.sample', { returnObjects: true }) as string[];

  const pageStyle: CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSizePx}px`,
    lineHeight: style.lineHeight,
    paddingLeft: `${style.marginLeftEm}em`,
    paddingRight: `${style.marginRightEm}em`,
  };
  const paragraphStyle: CSSProperties = {
    margin: `${style.paragraphSpacingTopEm}em 0 ${style.paragraphSpacingBottomEm}em 0`,
    textIndent: `${style.indentEm}em`,
  };

  const caption = t('preview.caption', { font: t(`fonts.${fontId}`), size: style.fontSizePx });
  return (
    <section className="group">
      <h2 className="group__title">{t('preview.title')}</h2>
      <div className="preview card" aria-label={t('preview.title')}>
        <p className="preview__caption">{caption}</p>
        <div className="preview__page" style={pageStyle}>
          {paragraphs.map((text, index) => (
            <p key={index} style={paragraphStyle}>
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
