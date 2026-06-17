import { useTranslation } from 'react-i18next';
import type { Theme } from './useTheme';

interface ThemeToggleProps {
  readonly theme: Theme;
  readonly onToggle: () => void;
}

/** A single sun/moon icon button that toggles between light and dark. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onToggle}
      aria-label={t('theme.toggle')}
      title={t('theme.toggle')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <path
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="2"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  );
}
