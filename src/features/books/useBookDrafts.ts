import { useCallback, useMemo, useState } from 'react';
import { uuid } from '../../core/id';
import { titleFromFileName } from '../../core/parse/types';
import { normalizeCoverImage } from '../cover/image';
import { expandFiles } from '../intake/expandFiles';
import type { BookDraft, BookDraftPatch, DraftCover } from './types';

export interface BookDrafts {
  readonly drafts: readonly BookDraft[];
  /** Names skipped on the most recent intake (unsupported formats). */
  readonly skipped: readonly string[];
  readonly addFiles: (input: readonly File[]) => Promise<void>;
  readonly patch: (id: string, changes: BookDraftPatch) => void;
  readonly remove: (id: string) => void;
  readonly setCover: (id: string, file: File) => Promise<void>;
  readonly clearCover: (id: string) => void;
}

/**
 * Owns the batch of pending Books. Encapsulates the object-URL lifecycle for
 * Cover previews — every code path that drops a Cover image revokes its URL, so
 * callers never have to think about leaks.
 */
export function useBookDrafts(): BookDrafts {
  const [drafts, setDrafts] = useState<readonly BookDraft[]>([]);
  const [skipped, setSkipped] = useState<readonly string[]>([]);

  const addFiles = useCallback(async (input: readonly File[]) => {
    const { files, skipped: skippedNames } = await expandFiles(input);
    const created = files.map(
      (file): BookDraft => ({
        id: uuid(),
        file,
        sourceName: file.name,
        title: titleFromFileName(file.name),
        tocTitle: '',
        author: '',
        cover: { kind: 'auto' },
      }),
    );
    setDrafts((prev) => [...prev, ...created]);
    setSkipped(skippedNames);
  }, []);

  const patch = useCallback((id: string, changes: BookDraftPatch) => {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...changes } : draft)));
  }, []);

  const remove = useCallback((id: string) => {
    setDrafts((prev) =>
      prev.filter((draft) => {
        if (draft.id !== id) return true;
        revokeCover(draft.cover);
        return false;
      }),
    );
  }, []);

  const setCover = useCallback(async (id: string, file: File) => {
    const image = await normalizeCoverImage(file);
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id) return draft;
        revokeCover(draft.cover);
        return { ...draft, cover: { kind: 'image', ...image } };
      }),
    );
  }, []);

  const clearCover = useCallback((id: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id || draft.cover.kind !== 'image') return draft;
        revokeCover(draft.cover);
        return { ...draft, cover: { kind: 'auto' } };
      }),
    );
  }, []);

  return useMemo(
    () => ({ drafts, skipped, addFiles, patch, remove, setCover, clearCover }),
    [drafts, skipped, addFiles, patch, remove, setCover, clearCover],
  );
}

function revokeCover(cover: DraftCover): void {
  if (cover.kind === 'image') URL.revokeObjectURL(cover.previewUrl);
}
