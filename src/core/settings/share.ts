import { type FontId, FONT_OPTIONS, fontOption } from '../fonts/catalog';
import type { ReflowOptions } from '../reflow/reflow';
import type { Style } from '../types';

/**
 * The shareable subset of the UI state: everything a reader could want to carry
 * in a link (Reflow rules + batch-wide Style + font). Per-Book data (Title,
 * author, Cover, the documents themselves) is intentionally excluded.
 *
 * Encoded into a URL hash so visiting the link restores the exact look. `Style`
 * is fully derivable from these fields, so `fontFamily` is not stored — it is
 * rebuilt from `fontId` on decode.
 */
export interface ShareableSettings {
  readonly reflow: ReflowOptions;
  readonly style: Style;
  readonly fontId: FontId;
}

const VERSION = 1;
const MAX_TERMINATORS = 100;

export function encodeSettings(settings: ShareableSettings): string {
  const { reflow, style, fontId } = settings;
  const payload = {
    v: VERSION,
    f: fontId,
    r: { e: reflow.enabled, t: reflow.terminators, j: reflow.joinWithSpace },
    s: {
      fs: style.fontSizePx,
      lh: style.lineHeight,
      ml: style.marginLeftEm,
      mr: style.marginRightEm,
      pt: style.paragraphSpacingTopEm,
      pb: style.paragraphSpacingBottomEm,
      in: style.indentEm,
    },
  };
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Decode settings from a link. Every field is validated and clamped, and
 * anything missing or malformed falls back to `fallback`, so a hand-edited or
 * outdated link can never produce a broken UI.
 */
export function decodeSettings(encoded: string, fallback: ShareableSettings): ShareableSettings {
  const record = parse(encoded);
  if (!record || record.v !== VERSION) return fallback;

  const reflowRecord = asRecord(record.r);
  const styleRecord = asRecord(record.s);
  const fontId = isFontId(record.f) ? record.f : fallback.fontId;

  return {
    fontId,
    reflow: {
      enabled: bool(reflowRecord?.e, fallback.reflow.enabled),
      terminators: str(reflowRecord?.t, fallback.reflow.terminators, MAX_TERMINATORS),
      joinWithSpace: bool(reflowRecord?.j, fallback.reflow.joinWithSpace),
    },
    style: {
      fontFamily: fontOption(fontId).cssFamily,
      fontSizePx: num(styleRecord?.fs, fallback.style.fontSizePx, 12, 28),
      lineHeight: num(styleRecord?.lh, fallback.style.lineHeight, 1.2, 2.6),
      marginLeftEm: num(styleRecord?.ml, fallback.style.marginLeftEm, 0, 4),
      marginRightEm: num(styleRecord?.mr, fallback.style.marginRightEm, 0, 4),
      paragraphSpacingTopEm: num(styleRecord?.pt, fallback.style.paragraphSpacingTopEm, 0, 2),
      paragraphSpacingBottomEm: num(styleRecord?.pb, fallback.style.paragraphSpacingBottomEm, 0, 2),
      indentEm: num(styleRecord?.in, fallback.style.indentEm, 0, 3),
    },
  };
}

function parse(encoded: string): Record<string, unknown> | undefined {
  try {
    return asRecord(JSON.parse(fromBase64Url(encoded)));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function isFontId(value: unknown): value is FontId {
  return typeof value === 'string' && FONT_OPTIONS.some((font) => font.id === value);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
