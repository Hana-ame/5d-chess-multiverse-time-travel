import React from 'react';
import { useI18n } from '../i18n';

interface LocaleSwitcherProps {
  /** Compact variant for the in-game HUD top bar. */
  compact?: boolean;
}

/**
 * A minimal EN / 中文 language toggle. Styled to blend with the app's
 * dark-slate + amber aesthetic and the mono/display typography.
 */
export const LocaleSwitcher: React.FC<LocaleSwitcherProps> = ({ compact = false }) => {
  const { locale, setLocale } = useI18n();

  const baseBtn =
    'rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap';
  const active = 'bg-amber-500 text-slate-950 shadow-sm';
  const inactive = 'text-slate-300 hover:text-white';

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-lg border border-slate-800 ${
        compact ? 'bg-slate-900/90' : 'bg-slate-900/90'
      }`}
      role="group"
      aria-label="Language / 语言"
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`${baseBtn} ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} ${
          locale === 'en' ? active : inactive
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={`${baseBtn} ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} ${
          locale === 'zh' ? active : inactive
        }`}
      >
        中文
      </button>
    </div>
  );
};
