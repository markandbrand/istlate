import { LOCALES, useI18n } from '../i18n/index.jsx'

/** Interruptor de idioma. Dos idiomas, así que un par de pastillas basta. */
export default function LanguageToggle() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center gap-1 rounded-full border-2 border-line bg-card p-1">
      {Object.keys(LOCALES).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          aria-label={LOCALES[code].label}
          className={
            locale === code
              ? 'cursor-pointer rounded-full border-none bg-blue px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-white uppercase'
              : 'cursor-pointer rounded-full border-none bg-transparent px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] text-ink-dim uppercase hover:text-blue'
          }
        >
          {code}
        </button>
      ))}
    </div>
  )
}
