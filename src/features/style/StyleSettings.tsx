import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { type FontId, FONT_OPTIONS } from '../../core/fonts/catalog';
import type { Style } from '../../core/types';

interface StyleSettingsProps {
  readonly style: Style;
  readonly fontId: FontId;
  readonly disabled: boolean;
  readonly onFontChange: (id: FontId) => void;
  readonly onStyleChange: (patch: Partial<Style>) => void;
}

/**
 * Batch-wide formatting controls: a single-select font picker plus size,
 * margins, paragraph spacing, line height, and indent. Plain language only —
 * the audience is non-developers. The live preview reflects every change.
 */
export function StyleSettings({
  style,
  fontId,
  disabled,
  onFontChange,
  onStyleChange,
}: StyleSettingsProps): JSX.Element {
  const { t } = useTranslation();
  const fontGroupId = useId();

  return (
    <section className="group">
      <h2 className="group__title">{t('style.legend')}</h2>
      <fieldset className="settings card" disabled={disabled} aria-label={t('style.legend')}>
        <div className="settings__field" role="radiogroup" aria-labelledby={fontGroupId}>
          <span id={fontGroupId}>{t('style.font')}</span>
          <div className="font-picker">
            {FONT_OPTIONS.map((option) => (
              <label key={option.id} className="font-picker__option">
                <input
                  type="radio"
                  name="font"
                  value={option.id}
                  checked={fontId === option.id}
                  onChange={() => onFontChange(option.id)}
                />
                <span>{t(`fonts.${option.id}`)}</span>
              </label>
            ))}
          </div>
        </div>

        <RangeField
          label={t('style.fontSize')}
          value={style.fontSizePx}
          min={12}
          max={28}
          step={1}
          unit="px"
          onChange={(fontSizePx) => onStyleChange({ fontSizePx })}
        />
        <RangeField
          label={t('style.lineHeight')}
          value={style.lineHeight}
          min={1.2}
          max={2.6}
          step={0.1}
          onChange={(lineHeight) => onStyleChange({ lineHeight })}
        />
        <RangeField
          label={t('style.marginLeft')}
          value={style.marginLeftEm}
          min={0}
          max={4}
          step={0.1}
          unit="em"
          onChange={(marginLeftEm) => onStyleChange({ marginLeftEm })}
        />
        <RangeField
          label={t('style.marginRight')}
          value={style.marginRightEm}
          min={0}
          max={4}
          step={0.1}
          unit="em"
          onChange={(marginRightEm) => onStyleChange({ marginRightEm })}
        />
        <RangeField
          label={t('style.spacingTop')}
          value={style.paragraphSpacingTopEm}
          min={0}
          max={2}
          step={0.1}
          unit="em"
          onChange={(paragraphSpacingTopEm) => onStyleChange({ paragraphSpacingTopEm })}
        />
        <RangeField
          label={t('style.spacingBottom')}
          value={style.paragraphSpacingBottomEm}
          min={0}
          max={2}
          step={0.1}
          unit="em"
          onChange={(paragraphSpacingBottomEm) => onStyleChange({ paragraphSpacingBottomEm })}
        />
        <RangeField
          label={t('style.indent')}
          value={style.indentEm}
          min={0}
          max={3}
          step={0.1}
          unit="em"
          onChange={(indentEm) => onStyleChange({ indentEm })}
        />
      </fieldset>
    </section>
  );
}

interface RangeFieldProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit?: string;
  readonly onChange: (value: number) => void;
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: RangeFieldProps): JSX.Element {
  const id = useId();
  return (
    <label className="range-field" htmlFor={id}>
      <span className="range-field__label">
        {label}
        <span className="range-field__value">
          {value}
          {unit ?? ''}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
