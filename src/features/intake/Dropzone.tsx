import { useCallback, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DropzoneProps {
  /** Comma-separated accept hint for the file dialog, e.g. ".txt". */
  readonly accept: string;
  readonly disabled: boolean;
  readonly onFiles: (files: readonly File[]) => void;
}

/**
 * The attach card: click to open a file dialog, or drag-and-drop files onto it.
 * Keyboard-operable (Enter/Space) and announces its drag state to assistive tech.
 */
export function Dropzone({ accept, disabled, onFiles }: DropzoneProps): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const emit = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      onFiles(Array.from(list));
    },
    [onFiles],
  );

  const openDialog = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (!disabled) emit(event.dataTransfer.files);
    },
    [disabled, emit],
  );

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={inputId}
      onClick={openDialog}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDialog();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <svg
        className="dropzone__icon"
        viewBox="0 0 24 24"
        width="44"
        height="44"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"
        />
      </svg>
      <p className="dropzone__title">{t('intake.title')}</p>
      <p id={inputId} className="dropzone__hint">
        {t('intake.hint')}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
