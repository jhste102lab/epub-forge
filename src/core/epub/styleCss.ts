import type { Style } from '../types';

const FONT_PATH = 'fonts/body.otf';

/** A font subset to embed so the chosen typeface renders on any reader. */
export interface EmbeddedFont {
  /** The `@font-face` family name; must match the family in `Style.fontFamily`. */
  readonly family: string;
  readonly bytes: Uint8Array;
}

export function styleCss(style: Style, embeddedFont?: EmbeddedFont): string {
  const fontFace = embeddedFont
    ? `@font-face {
  font-family: '${embeddedFont.family}';
  font-weight: normal;
  font-style: normal;
  src: url(${FONT_PATH}) format('opentype');
}

`
    : '';
  return `@namespace epub "http://www.idpf.org/2007/ops";

${fontFace}html {
  font-size: ${style.fontSizePx}px;
}

body {
  font-family: ${style.fontFamily};
  line-height: ${style.lineHeight};
  margin: 0 ${style.marginRightEm}em 0 ${style.marginLeftEm}em;
}

h1.chapter-title {
  font-size: 1.4em;
  line-height: 1.4;
  margin: 1em 0;
  text-align: center;
}

p {
  margin: ${style.paragraphSpacingTopEm}em 0 ${style.paragraphSpacingBottomEm}em 0;
  text-indent: ${style.indentEm}em;
}

p.blank {
  text-indent: 0;
}

div.cover {
  margin: 0;
  padding: 0;
  text-align: center;
}

div.cover img {
  max-width: 100%;
  height: auto;
}
`;
}
