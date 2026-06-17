/**
 * Core domain types shared by the parser, conversion, and EPUB writer layers.
 * This module is framework-agnostic and pure — no DOM, no React.
 */

/**
 * The cover image of a Book. In this slice only `none` and a concrete `image`
 * exist; the shared and auto-generated sources arrive with the Cover slice.
 */
export type Cover =
  | { readonly kind: 'none' }
  | { readonly kind: 'image'; readonly bytes: Uint8Array; readonly mediaType: string };

/**
 * Batch-wide formatting applied to every Book at once. Distinct from per-Book
 * data (Title, author, Cover). The Style slice expands the editing UI; the
 * shape lives here because the EPUB writer depends on it.
 */
export interface Style {
  readonly fontFamily: string;
  readonly fontSizePx: number;
  readonly lineHeight: number;
  readonly marginLeftEm: number;
  readonly marginRightEm: number;
  readonly paragraphSpacingTopEm: number;
  readonly paragraphSpacingBottomEm: number;
  readonly indentEm: number;
}

/**
 * One output EPUB. There is a strict one-to-one relationship with a Document.
 * A Book carries its own Title, author, and Cover; its body is a flat list of
 * paragraphs and its single table-of-contents entry equals the Title.
 */
export interface Book {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  /** BCP-47 language tag, e.g. "ko". */
  readonly language: string;
  readonly paragraphs: readonly string[];
  readonly cover: Cover;
}

export const DEFAULT_STYLE: Style = {
  fontFamily: "'Noto Serif KR', serif",
  fontSizePx: 18,
  lineHeight: 1.8,
  marginLeftEm: 1.2,
  marginRightEm: 1.2,
  paragraphSpacingTopEm: 0,
  paragraphSpacingBottomEm: 0.6,
  indentEm: 1,
};
