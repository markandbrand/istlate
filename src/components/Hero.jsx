import { useI18n } from '../i18n/index.jsx'

export default function Hero({ value, onChange, onSearch, onUseDemo }) {
  const { t, demoCode } = useI18n()

  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <section className="pt-[52px] pb-[34px] text-center">
      <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-dim px-[14px] py-[6px] font-mono text-[12px] tracking-[0.1em] text-blue uppercase">
        {t.eyebrow}
      </span>

      <h1 className="mt-0 mb-4 font-display text-[clamp(36px,6vw,60px)] leading-[1.08] font-bold text-ink text-balance">
        {t.h1.map((part, i) =>
          part.br ? (
            <br key={i} />
          ) : part.highlight ? (
            <span key={i} className="text-coral">
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </h1>

      <p className="mx-auto mt-0 mb-[34px] max-w-[480px] text-[clamp(15px,2vw,18px)] leading-[1.55] text-ink-dim">
        {t.sub}
      </p>

      <div className="mx-auto flex max-w-[420px] gap-2 rounded-2xl border-2 border-line bg-card p-[7px] shadow-soft">
        <label className="sr-only" htmlFor="flightInput">
          {t.searchLabel}
        </label>
        <input
          id="flightInput"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={demoCode}
          maxLength={8}
          autoComplete="off"
          className="min-w-0 flex-1 border-none bg-transparent px-[14px] py-3 font-mono text-[18px] tracking-[0.05em] text-ink uppercase placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onSearch}
          className="cursor-pointer rounded-[11px] border-none bg-coral px-[22px] font-display text-[15px] font-semibold whitespace-nowrap text-white transition-[background-color,transform] duration-150 ease-in-out hover:-translate-y-px hover:bg-coral-hover"
        >
          {t.searchButton}
        </button>
      </div>

      <div className="mt-[14px] text-[13px] text-ink-dim">
        {t.hint}{' '}
        <button
          type="button"
          onClick={onUseDemo}
          className="cursor-pointer border-none bg-transparent p-0 font-semibold text-blue underline underline-offset-[3px]"
        >
          {t.hintAction(demoCode)}
        </button>
      </div>
    </section>
  )
}
