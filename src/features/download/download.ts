/** Trigger a browser download of raw bytes under the given filename. */
export function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType = 'application/octet-stream',
): void {
  // Copy into a fresh ArrayBuffer so the Blob part is not a (possibly shared) view.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const EPUB_MIME = 'application/epub+zip';
export const ZIP_MIME = 'application/zip';
