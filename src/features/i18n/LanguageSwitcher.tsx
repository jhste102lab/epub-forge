import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

/** Dropdown to switch the UI language; the choice is persisted by i18next. */
export function LanguageSwitcher(): JSX.Element {
  const { t, i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => i18n.language.startsWith(l.code))?.code ?? 'en';

  return (
    <label className="language-switcher">
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
