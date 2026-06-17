import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reflow, type ReflowOptions } from '../../core/reflow/reflow';

interface ReflowSettingsProps {
  readonly value: ReflowOptions;
  readonly disabled: boolean;
  readonly onChange: (next: ReflowOptions) => void;
}

/**
 * Controls for Reflow: whether to re-join wrapped lines, the Terminator set, and
 * whether joining inserts a space. Deliberately plain-language (the audience is
 * non-developers) — no "Reflow"/"Terminator" jargon in the labels.
 */
export function ReflowSettings({ value, disabled, onChange }: ReflowSettingsProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const enabledId = useId();
  const spaceId = useId();
  const terminatorsId = useId();

  return (
    <section className="group">
      <h2 className="group__title">{t('reflow.legend')}</h2>
      <fieldset className="settings card" disabled={disabled} aria-label={t('reflow.legend')}>
        <label className="settings__row" htmlFor={enabledId}>
          <input
            id={enabledId}
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          <span>{t('reflow.join')}</span>
        </label>

        <label className="settings__row" htmlFor={spaceId}>
          <input
            id={spaceId}
            type="checkbox"
            checked={value.joinWithSpace}
            disabled={!value.enabled}
            onChange={(e) => onChange({ ...value, joinWithSpace: e.target.checked })}
          />
          <span>{t('reflow.joinSpace')}</span>
        </label>

        <label className="settings__field" htmlFor={terminatorsId}>
          <span>{t('reflow.terminators')}</span>
          <input
            id={terminatorsId}
            type="text"
            className="settings__input"
            value={value.terminators}
            disabled={!value.enabled}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onChange({ ...value, terminators: e.target.value })}
          />
        </label>

        <ReflowExample key={i18n.language} value={value} />
      </fieldset>
    </section>
  );
}

const EXAMPLE_MAX_LENGTH = 200;

/** Live demonstration: an editable sample reflowed with the current settings. */
function ReflowExample({ value }: { readonly value: ReflowOptions }): JSX.Element {
  const { t } = useTranslation();
  const exampleId = useId();
  const [sample, setSample] = useState(() =>
    (t('reflow.exampleLines', { returnObjects: true }) as string[]).join('\n'),
  );
  const paragraphs = reflow(sample, value).filter((p) => p.length > 0);

  return (
    <div className="reflow-example">
      <label className="reflow-example__title" htmlFor={exampleId}>
        {t('reflow.exampleTitle')}
      </label>
      <textarea
        id={exampleId}
        className="reflow-example__input"
        rows={4}
        maxLength={EXAMPLE_MAX_LENGTH}
        spellCheck={false}
        value={sample}
        onChange={(e) => setSample(e.target.value)}
      />
      <div className="reflow-example__paras" aria-live="polite">
        {paragraphs.map((para, index) => (
          <p key={index} className="reflow-example__para">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
