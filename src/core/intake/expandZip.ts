import { unzipSync } from 'fflate';
import { isSupported } from '../parse/registry';
import { extensionOf, type FileLike } from '../parse/types';
import type { BookSource, ImagePage } from '../types';

export interface ExpandResult {
  /** Each source becomes one Book: a document or a complete image archive. */
  readonly files: BookSource[];
  /** Unsupported entry paths, or an archive-level failure, for the intake notice. */
  readonly skipped: string[];
}

const EMPTY_BYTES = new Uint8Array(0);
const IMAGE_EXTENSIONS: Record<string, true> = { jpg: true, jpeg: true, png: true, webp: true };
const UNSUPPORTED_IMAGE_EXTENSIONS: Record<string, true> = {
  gif: true,
  avif: true,
  bmp: true,
  tif: true,
  tiff: true,
  svg: true,
  heic: true,
  heif: true,
  jxl: true,
  jp2: true,
  j2k: true,
  jpf: true,
  jpx: true,
  ico: true,
  psd: true,
  apng: true,
};

/**
 * Document-containing ZIPs retain the document extraction behavior (images are
 * reported as skipped). Without documents, JPEG/PNG/WebP pages form ONE image book.
 * The filter classifies entry names without inflating images on the main thread.
 */
export function expandZip(archive: FileLike): ExpandResult {
  const paths: string[] = [];
  const documents = unzipSync(archive.bytes, {
    filter: ({ name }) => {
      if (isIgnored(name)) return false;
      paths.push(name);
      return isDocumentPath(name);
    },
  });
  if (Object.keys(documents).length > 0) {
    return {
      files: Object.entries(documents).map(([name, bytes]) => ({ kind: 'document', name, bytes })),
      skipped: paths.filter((path) => !isDocumentPath(path)),
    };
  }

  imagePaths(paths, archive.name);
  return {
    files: [{ kind: 'image-zip', name: archive.name, bytes: archive.bytes }],
    skipped: paths.filter((path) => !isImagePath(path)),
  };
}

/** Extract original page bytes only during conversion, preserving full entry paths. */
export function readImageZip(archive: FileLike): ImagePage[] {
  const paths: string[] = [];
  const entries = unzipSync(archive.bytes, {
    filter: ({ name }) => {
      if (isIgnored(name)) return false;
      paths.push(name);
      return isImagePath(name);
    },
  });
  if (paths.some(isDocumentPath)) {
    throw new Error(`"${archive.name}" contains documents; add it as a document ZIP.`);
  }
  return imagePaths(paths, archive.name)
    .sort(naturalPathCompare)
    .map((sourcePath) => {
      const bytes = entries[sourcePath];
      const mediaType = sniffImageMediaType(bytes);
      if (!mediaType)
        throw new Error(`Invalid or unsupported image page "${sourcePath}" in "${archive.name}".`);
      return { sourcePath, bytes, mediaType };
    });
}

/** Numeric runs sort by magnitude; all other characters use codepoint order. */
function naturalPathCompare(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const aCode = a.codePointAt(i);
    const bCode = b.codePointAt(j);
    if (aCode === undefined || bCode === undefined) {
      if (aCode === undefined && bCode === undefined) break;
      return aCode === undefined ? -1 : 1;
    }
    if (aCode >= 48 && aCode <= 57 && bCode >= 48 && bCode <= 57) {
      let aEnd = i;
      let bEnd = j;
      while (aEnd < a.length && a.charCodeAt(aEnd) >= 48 && a.charCodeAt(aEnd) <= 57) aEnd++;
      while (bEnd < b.length && b.charCodeAt(bEnd) >= 48 && b.charCodeAt(bEnd) <= 57) bEnd++;
      while (i < aEnd - 1 && a.charCodeAt(i) === 48) i++;
      while (j < bEnd - 1 && b.charCodeAt(j) === 48) j++;
      if (aEnd - i !== bEnd - j) return aEnd - i - (bEnd - j);
      while (i < aEnd && j < bEnd) {
        if (a.charCodeAt(i) !== b.charCodeAt(j)) return a.charCodeAt(i) - b.charCodeAt(j);
        i++;
        j++;
      }
    } else {
      if (aCode !== bCode) return aCode - bCode;
      i += aCode > 0xffff ? 2 : 1;
      j += bCode > 0xffff ? 2 : 1;
    }
  }
  if (i < a.length) return 1;
  if (j < b.length) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function imagePaths(paths: readonly string[], archiveName: string): string[] {
  const unsupportedImages = paths.filter((path) =>
    Object.hasOwn(UNSUPPORTED_IMAGE_EXTENSIONS, extensionOf(path)),
  );
  if (unsupportedImages.length > 0) {
    throw new Error(
      `"${archiveName}": unsupported image pages (${unsupportedImages.join(', ')}). Use JPEG, PNG, or WebP.`,
    );
  }
  const pages = paths.filter(isImagePath);
  if (pages.length === 0)
    throw new Error(`"${archiveName}" contains no supported documents or JPEG/PNG/WebP pages.`);
  return pages;
}

function isImagePath(path: string): boolean {
  return Object.hasOwn(IMAGE_EXTENSIONS, extensionOf(path));
}

function sniffImageMediaType(bytes: Uint8Array): ImagePage['mediaType'] | undefined {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 82 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 70 &&
    bytes[8] === 87 &&
    bytes[9] === 69 &&
    bytes[10] === 66 &&
    bytes[11] === 80
  ) {
    return 'image/webp';
  }
  return undefined;
}

function isDocumentPath(path: string): boolean {
  return isSupported({ name: path, bytes: EMPTY_BYTES });
}

function isIgnored(path: string): boolean {
  return (
    path.endsWith('/') ||
    path.split('/').some((part) => part === '__MACOSX' || part.startsWith('.'))
  );
}
