import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * "Save settings" action: copies the current URL — which carries the active
 * Reflow/Style/font in its hash — and confirms with a short modal that opening
 * the link restores the same settings.
 */
export function ShareSettings(): JSX.Element {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const share = useCallback(() => {
    void copyToClipboard(window.location.href);
    setConfirmOpen(true);
  }, []);

  return (
    <>
      <button type="button" className="share-card" onClick={share}>
        <LinkIcon />
        {t('share.save')}
      </button>
      {confirmOpen && <ShareModal onClose={() => setConfirmOpen(false)} />}
    </>
  );
}

function ShareModal({ onClose }: { readonly onClose: () => void }): JSX.Element {
  const { t } = useTranslation();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="modal__title">
          {t('share.modalTitle')}
        </h2>
        <p className="modal__message">{t('share.modalMessage')}</p>
        <button
          ref={closeRef}
          type="button"
          className="button button--primary modal__close"
          onClick={onClose}
        >
          {t('share.close')}
        </button>
      </div>
    </div>
  );
}

/** Copy text, falling back to a textarea for insecure origins (e.g. a LAN IP). */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the legacy path
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function LinkIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"
      />
    </svg>
  );
}
