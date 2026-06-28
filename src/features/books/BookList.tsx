import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { BookDraft, BookDraftPatch } from './types';

interface BookListProps {
  readonly drafts: readonly BookDraft[];
  readonly disabled: boolean;
  readonly busyId: string | null;
  readonly onPatch: (id: string, patch: BookDraftPatch) => void;
  readonly onRemove: (id: string) => void;
  readonly onSetCover: (id: string, file: File) => void;
  readonly onResetCover: (id: string) => void;
  readonly onDownloadOne: (id: string) => void;
}

/**
 * The Sigil-like Book list: one row per Book with an editable Title, author, and
 * Cover (Title defaults from the filename). Editing here is what removes the
 * need to fix titles and covers in Sigil after conversion.
 */
export function BookList({
  drafts,
  disabled,
  busyId,
  onPatch,
  onRemove,
  onSetCover,
  onResetCover,
  onDownloadOne,
}: BookListProps): JSX.Element {
  return (
    <ul className="book-list">
      {drafts.map((draft) => (
        <BookRow
          key={draft.id}
          draft={draft}
          disabled={disabled}
          busy={busyId === draft.id}
          onPatch={onPatch}
          onRemove={onRemove}
          onSetCover={onSetCover}
          onResetCover={onResetCover}
          onDownloadOne={onDownloadOne}
        />
      ))}
    </ul>
  );
}

interface BookRowProps {
  readonly draft: BookDraft;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly onPatch: (id: string, patch: BookDraftPatch) => void;
  readonly onRemove: (id: string) => void;
  readonly onSetCover: (id: string, file: File) => void;
  readonly onResetCover: (id: string) => void;
  readonly onDownloadOne: (id: string) => void;
}

function BookRow({
  draft,
  disabled,
  busy,
  onPatch,
  onRemove,
  onSetCover,
  onResetCover,
  onDownloadOne,
}: BookRowProps): JSX.Element {
  const { t } = useTranslation();
  const titleId = useId();
  const tocTitleId = useId();
  const authorId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const hasImage = draft.cover.kind === 'image';

  return (
    <li className="book-row">
      <div className="book-row__cover">
        <button
          type="button"
          className="cover-thumb"
          disabled={disabled}
          onClick={() => coverInputRef.current?.click()}
          aria-label={t('book.cover')}
        >
          {draft.cover.kind === 'image' ? (
            <img src={draft.cover.previewUrl} alt="" />
          ) : (
            <span className="cover-thumb__auto">{t('book.coverAuto')}</span>
          )}
        </button>
        {hasImage && (
          <button
            type="button"
            className="cover-thumb__reset"
            disabled={disabled}
            onClick={() => onResetCover(draft.id)}
          >
            {t('book.coverReset')}
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSetCover(draft.id, file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="book-row__main">
        <p className="book-row__source" title={draft.sourceName}>
          {draft.sourceName}
        </p>
        <div className="book-row__fields">
          <label className="book-row__field" htmlFor={titleId}>
            <span>{t('book.title')}</span>
            <input
              id={titleId}
              type="text"
              value={draft.title}
              disabled={disabled}
              onChange={(e) => onPatch(draft.id, { title: e.target.value })}
            />
          </label>
          <label className="book-row__field" htmlFor={tocTitleId}>
            <span>{t('book.tocTitle')}</span>
            <input
              id={tocTitleId}
              type="text"
              value={draft.tocTitle}
              disabled={disabled}
              placeholder={t('book.tocTitlePlaceholder')}
              onChange={(e) => onPatch(draft.id, { tocTitle: e.target.value })}
            />
          </label>
          <label className="book-row__field" htmlFor={authorId}>
            <span>{t('book.author')}</span>
            <input
              id={authorId}
              type="text"
              value={draft.author}
              disabled={disabled}
              placeholder={t('book.authorPlaceholder')}
              onChange={(e) => onPatch(draft.id, { author: e.target.value })}
            />
          </label>
        </div>
        <div className="book-row__actions">
          <button
            type="button"
            className="book-row__remove"
            disabled={disabled}
            onClick={() => onRemove(draft.id)}
            aria-label={t('book.remove')}
            title={t('book.remove')}
          >
            <TrashIcon />
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={disabled}
            onClick={() => onDownloadOne(draft.id)}
          >
            {busy ? t('book.converting') : t('book.download')}
          </button>
        </div>
      </div>
    </li>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6m4 5v6m6-6v6"
      />
    </svg>
  );
}
