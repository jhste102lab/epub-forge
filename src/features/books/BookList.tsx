import { useId, useRef, useState } from 'react';
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
  const coverHintId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const hasImage = draft.cover.kind === 'image';
  const [dragging, setDragging] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverDisabled = disabled || busy;
  const error = coverError ?? draft.coverError;

  const setCover = (files: readonly File[]): void => {
    if (coverDisabled) return;
    if (files.length !== 1) {
      setCoverError(files.length > 1 ? 'book.coverMultiple' : 'book.coverInvalid');
      return;
    }
    const file = files[0];
    if (!file || !/^image\/(?:png|jpeg|webp|gif|bmp|avif)$/i.test(file.type)) {
      setCoverError('book.coverInvalid');
      return;
    }
    setCoverError(null);
    onSetCover(draft.id, file);
  };

  return (
    <li className="book-row">
      <div
        className="book-row__cover"
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = coverDisabled ? 'none' : 'copy';
          setDragging(!coverDisabled);
        }}
        onDragLeave={(event) => {
          event.stopPropagation();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          setCover(Array.from(event.dataTransfer.files));
        }}
      >
        <button
          type="button"
          className={`cover-thumb${dragging && !coverDisabled ? ' cover-thumb--active' : ''}`}
          disabled={coverDisabled}
          onClick={(event) => {
            event.currentTarget.focus();
            coverInputRef.current?.click();
          }}
          onPaste={(event) => {
            // Text and URLs remain ordinary paste; only clipboard files target this cover.
            if (event.clipboardData.files.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            setCover(Array.from(event.clipboardData.files));
          }}
          aria-label={t('book.cover')}
          aria-describedby={coverHintId}
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
            disabled={coverDisabled}
            onClick={() => {
              setCoverError(null);
              onResetCover(draft.id);
            }}
          >
            {t('book.coverReset')}
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
          disabled={coverDisabled}
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) setCover(files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="book-row__main">
        <p className="book-row__source" title={draft.sourceName}>
          {draft.sourceName}
        </p>
        <p id={coverHintId} className="book-row__cover-hint">
          {t('book.coverHint')}
        </p>
        {error && (
          <p className="book-row__cover-error" role="alert">
            {t(error)}
          </p>
        )}
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
