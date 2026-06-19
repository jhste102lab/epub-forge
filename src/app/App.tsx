import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

const GITHUB_URL = 'https://github.com/jhste102lab/epub-forge';
const TISTORY_URL = 'https://jhste102lab.tistory.com';

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
          <div className="brand__links" aria-label="Project links">
            <IconLink href={GITHUB_URL} label="GitHub">
              <GitHubIcon />
            </IconLink>
            <IconLink href={TISTORY_URL} label="Tistory">
              <TistoryIcon />
            </IconLink>
          </div>
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

function IconLink({
  href,
  label,
  children,
}: {
  readonly href: string;
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="brand__link"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

function GitHubIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.2-4.7-5A3.9 3.9 0 0 1 6.6 7.5c-.1-.3-.4-1.3.1-2.6 0 0 .9-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.3.2 2.3.1 2.6a3.9 3.9 0 0 1 1.1 2.8c0 3.8-2.4 4.7-4.7 5 .4.3.8 1 .8 2V21c0 .3.2.6.8.5A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function TistoryIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 459 459" aria-hidden="true" width="18" height="18" fill="currentColor">
      <path d="M229.5,0C102.75,0,0,102.75,0,229.5S102.75,459,229.5,459,459,356.25,459,229.5,356.25,0,229.5,0ZM130.21,191.45a39.57,39.57,0,1,1,39.56-39.57A39.58,39.58,0,0,1,130.21,191.45ZM229.5,390a39.56,39.56,0,1,1,39.56-39.56A39.56,39.56,0,0,1,229.5,390Zm0-99.29a39.56,39.56,0,1,1,39.56-39.56A39.56,39.56,0,0,1,229.5,290.74Zm0-99.29a39.57,39.57,0,1,1,39.56-39.57A39.57,39.57,0,0,1,229.5,191.45Zm99.29,0a39.57,39.57,0,1,1,39.57-39.57A39.57,39.57,0,0,1,328.79,191.45Z" />
    </svg>
  );
}
