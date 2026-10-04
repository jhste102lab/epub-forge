import type { BookSource } from '../../core/types';
import type { UploadedImage } from '../cover/image';

/**
 * The Cover choice for a Book: `auto` means "use the shared cover if set, else
 * generate one from Title/author"; `image` is a user-supplied picture.
 */
export type DraftCover = { readonly kind: 'auto' } | ({ readonly kind: 'image' } & UploadedImage);

/**
 * A pending Book in the batch: one Document or image ZIP plus per-Book metadata
 * the user can edit (Title, TOC title, author, Cover) before conversion. These are
 * per-Book; Style and Reflow are batch-wide and live elsewhere.
 */
export interface BookDraft {
  readonly id: string;
  readonly file: BookSource;
  readonly sourceName: string;
  readonly title: string;
  readonly tocTitle: string;
  readonly author: string;
  readonly cover: DraftCover;
  readonly coverError?: string | undefined;
}

/** Editable text fields of a BookDraft. */
export type BookDraftPatch = Partial<Pick<BookDraft, 'title' | 'tocTitle' | 'author'>>;
