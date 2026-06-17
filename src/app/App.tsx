import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_FONT_ID } from '../core/fonts/catalog';
import { DEFAULT_REFLOW_OPTIONS } from '../core/reflow/reflow';
import type { ShareableSettings } from '../core/settings/share';
import { DEFAULT_STYLE } from '../core/types';
import { BookList } from '../features/books/BookList';
import { useBookDrafts } from '../features/books/useBookDrafts';
import { useBookConversion } from '../features/convert/useBookConversion';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { Dropzone } from '../features/intake/Dropzone';
import { ReflowSettings } from '../features/settings/ReflowSettings';
import { ShareSettings } from '../features/settings/ShareSettings';
import { readSharedSettings, syncSharedSettings } from '../features/settings/shareUrl';
import { StylePreview } from '../features/style/StylePreview';
import { StyleSettings } from '../features/style/StyleSettings';
import { useTypography } from '../features/style/useTypography';
import { ThemeToggle } from '../features/theme/ThemeToggle';
import { useTheme } from '../features/theme/useTheme';
import './App.css';

// Reflow starts off so the dropped text is left untouched until the user opts in.
const DEFAULT_SETTINGS: ShareableSettings = {
  reflow: { ...DEFAULT_REFLOW_OPTIONS, enabled: false, joinWithSpace: false },
  style: DEFAULT_STYLE,
  fontId: DEFAULT_FONT_ID,
};

export function App(): JSX.Element {
  const { t } = useTranslation();
  const [theme, toggleTheme] = useTheme();
  const initial = useMemo(() => readSharedSettings(DEFAULT_SETTINGS), []);
  const [reflow, setReflow] = useState(initial.reflow);
  const typography = useTypography(initial.style, initial.fontId);
  const books = useBookDrafts();
  const conversion = useBookConversion({
    reflow,
    style: typography.style,
    fontId: typography.fontId,
  });

  // Mirror the current settings into the URL so the page is shareable.
  useEffect(() => {
    syncSharedSettings(
      { reflow, style: typography.style, fontId: typography.fontId },
      DEFAULT_SETTINGS,
    );
  }, [reflow, typography.style, typography.fontId]);

  const locked = conversion.busy || conversion.activeId !== null;

  const convertOne = (id: string): void => {
    const draft = books.drafts.find((d) => d.id === id);
    if (draft) void conversion.convertOne(draft);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <img
            className="brand__logo"
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            width="38"
            height="38"
          />
          <span className="brand__name">epub-forge</span>
        </div>
        <div className="topbar__controls">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <ShareSettings />
          <LanguageSwitcher />
        </div>
      </header>

      <section className="hero">
        <p className="hero__tagline">{t('app.subtitle')}</p>
        <Dropzone
          accept=".txt,.docx,.hwpx,.hwp,.zip"
          disabled={locked}
          onFiles={(files) => void books.addFiles(files)}
        />
        {books.skipped.length > 0 && (
          <p className="app__notice">{t('app.skipped', { names: books.skipped.join(', ') })}</p>
        )}
      </section>

      {books.drafts.length > 0 && (
        <section className="batch">
          <div className="batch__bar">
            <span className="batch__count">{t('batch.count', { n: books.drafts.length })}</span>
            {books.drafts.length >= 2 && (
              <button
                type="button"
                className="button button--primary"
                disabled={locked}
                onClick={() => void conversion.convertAll(books.drafts)}
              >
                {conversion.busy
                  ? t('batch.converting', {
                      done: conversion.progress?.done ?? 0,
                      total: conversion.progress?.total ?? books.drafts.length,
                    })
                  : t('batch.convertAll')}
              </button>
            )}
          </div>

          <BookList
            drafts={books.drafts}
            disabled={locked}
            busyId={conversion.activeId}
            onPatch={books.patch}
            onRemove={books.remove}
            onSetCover={(id, file) => void books.setCover(id, file)}
            onResetCover={books.clearCover}
            onDownloadOne={convertOne}
          />
        </section>
      )}

      {conversion.failures.length > 0 && (
        <ul className="app__failures">
          {conversion.failures.map((failure) => (
            <li key={failure.id}>
              <strong>{failure.sourceName}</strong> — {failure.message}
            </li>
          ))}
        </ul>
      )}

      <section className="cards">
        <ReflowSettings value={reflow} disabled={locked} onChange={setReflow} />
        <StyleSettings
          style={typography.style}
          fontId={typography.fontId}
          disabled={locked}
          onFontChange={typography.setFont}
          onStyleChange={typography.patchStyle}
        />
        <StylePreview style={typography.style} fontId={typography.fontId} />
      </section>
    </main>
  );
}
