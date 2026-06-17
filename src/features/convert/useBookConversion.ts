import { useCallback, useMemo, useState } from 'react';
import { type FontId, fontOption } from '../../core/fonts/catalog';
import { uuid } from '../../core/id';
import type { ReflowOptions } from '../../core/reflow/reflow';
import type { Cover, Style } from '../../core/types';
import type { WorkerConvertOptions } from '../../workers/conversion.api';
import { getConversionApi } from '../../workers/conversionClient';
import type { BookDraft } from '../books/types';
import { generateCover } from '../cover/image';
import { downloadBytes, EPUB_MIME, ZIP_MIME } from '../download/download';
import { type EpubFile, zipBooks } from '../download/zipBooks';

/** The batch-wide settings every conversion shares. */
export interface ConversionSettings {
  readonly reflow: ReflowOptions;
  readonly style: Style;
  readonly fontId: FontId;
}

export interface FailedBook {
  readonly id: string;
  readonly sourceName: string;
  readonly message: string;
}

export interface ConversionProgress {
  readonly done: number;
  readonly total: number;
}

export interface BookConversion {
  /** A whole-batch conversion is running. */
  readonly busy: boolean;
  /** Id of the single Book being converted on its own, if any. */
  readonly activeId: string | null;
  readonly progress: ConversionProgress | null;
  readonly failures: readonly FailedBook[];
  readonly convertOne: (draft: BookDraft) => Promise<void>;
  readonly convertAll: (drafts: readonly BookDraft[]) => Promise<void>;
}

/**
 * Drives conversion off the main thread (via the worker) and tracks its UI
 * state. A single Book downloads its EPUB; the whole batch downloads one ZIP.
 * Failures are collected rather than thrown so one bad Document never stops the
 * batch.
 */
export function useBookConversion(settings: ConversionSettings): BookConversion {
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [failures, setFailures] = useState<readonly FailedBook[]>([]);

  const buildRequest = useCallback(
    async (draft: BookDraft): Promise<WorkerConvertOptions> => {
      const font = fontOption(settings.fontId);
      return {
        title: draft.title,
        author: draft.author,
        reflow: settings.reflow,
        style: settings.style,
        cover: await resolveCover(draft),
        font: { family: font.family, assetPath: font.assetPath },
      };
    },
    [settings.fontId, settings.reflow, settings.style],
  );

  const convertOne = useCallback(
    async (draft: BookDraft) => {
      setActiveId(draft.id);
      try {
        const result = await getConversionApi().convert(draft.file, await buildRequest(draft));
        downloadBytes(result.bytes, result.fileName, EPUB_MIME);
        setFailures((prev) => prev.filter((f) => f.sourceName !== draft.sourceName));
      } catch (error) {
        setFailures([toFailure(draft, error)]);
      } finally {
        setActiveId(null);
      }
    },
    [buildRequest],
  );

  const convertAll = useCallback(
    async (drafts: readonly BookDraft[]) => {
      if (drafts.length === 0) return;
      setBusy(true);
      setFailures([]);
      const api = getConversionApi();
      const converted: EpubFile[] = [];
      const failed: FailedBook[] = [];

      for (const [index, draft] of drafts.entries()) {
        setProgress({ done: index, total: drafts.length });
        try {
          const result = await api.convert(draft.file, await buildRequest(draft));
          converted.push({ fileName: result.fileName, bytes: result.bytes });
        } catch (error) {
          failed.push(toFailure(draft, error));
        }
      }

      setProgress({ done: drafts.length, total: drafts.length });
      if (converted.length > 0) {
        downloadBytes(zipBooks(converted), `epub-forge-${converted.length}.zip`, ZIP_MIME);
      }
      setFailures(failed);
      setProgress(null);
      setBusy(false);
    },
    [buildRequest],
  );

  return useMemo(
    () => ({ busy, activeId, progress, failures, convertOne, convertAll }),
    [busy, activeId, progress, failures, convertOne, convertAll],
  );
}

/** The Cover to embed: the user's image, or one generated from Title/author. */
async function resolveCover(draft: BookDraft): Promise<Cover> {
  if (draft.cover.kind === 'image') {
    return { kind: 'image', bytes: draft.cover.bytes, mediaType: draft.cover.mediaType };
  }
  const generated = await generateCover(draft.title, draft.author);
  URL.revokeObjectURL(generated.previewUrl); // only the bytes are needed here
  return { kind: 'image', bytes: generated.bytes, mediaType: generated.mediaType };
}

function toFailure(draft: BookDraft, error: unknown): FailedBook {
  const message = error instanceof Error ? error.message : String(error);
  return { id: uuid(), sourceName: draft.sourceName, message };
}
