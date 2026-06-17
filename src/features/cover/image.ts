/**
 * Browser-only cover image helpers. The conversion pipeline (in the worker)
 * only ever receives ready-made image bytes; all canvas work lives here.
 */

/** A cover image normalized to an EPUB-safe format, plus a preview URL. */
export interface UploadedImage {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  /** Object URL for showing a thumbnail; revoke when no longer needed. */
  readonly previewUrl: string;
}

const MAX_COVER_HEIGHT = 1600;

/**
 * Decode any browser-supported image (png/jpg/webp/gif/bmp/avif…) and
 * re-encode it as a reasonably sized JPEG so every EPUB carries a safe format.
 */
export async function normalizeCoverImage(file: File): Promise<UploadedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_COVER_HEIGHT / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = makeCanvas(width, height);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
    return await canvasToImage(canvas, 'image/jpeg', 0.9);
  } finally {
    bitmap.close();
  }
}

/** Generate a simple Title/author cover when the user supplies no image. */
export async function generateCover(title: string, author: string): Promise<UploadedImage> {
  const width = 1200;
  const height = 1800;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이 브라우저에서는 표지를 만들 수 없습니다.');

  const hue = hashHue(title);
  ctx.fillStyle = `hsl(${hue}, 42%, 26%)`;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 92px serif';
  wrapText(ctx, title || '제목 없음', width / 2, height * 0.38, width - 200, 116);

  if (author) {
    ctx.font = '46px serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(author, width / 2, height - 200);
  }

  return canvasToImage(canvas, 'image/png');
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToImage(
  canvas: HTMLCanvasElement,
  mediaType: string,
  quality?: number,
): Promise<UploadedImage> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mediaType, quality);
  });
  if (!blob) throw new Error('이미지 변환에 실패했습니다.');
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mediaType,
    previewUrl: URL.createObjectURL(blob),
  };
}

function hashHue(text: string): number {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, x, startY + index * lineHeight));
}
