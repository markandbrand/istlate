import { useI18n } from '../i18n/index.jsx'

/** Orden en que tiene sentido enseñar los escenarios. */
const ORDER = ['late', 'risk', 'onTime', 'parked', 'overnight', 'gone',
               'unassigned', 'diverted', 'canceledUncertain', 'canceled']

/**
 * Selector de escenarios del modo demo.
 *
 * Existe porque sin datos reales no hay forma de provocar una cancelación o
 * un desvío. Cuando el proveedor esté conectado, se quita de aquí.
 */
export default function ScenarioSwitcher({ active, onPick }) {
  const { t, copy } = useI18n()

  return (
    <div className="mx-auto mt-2 max-w-[660px] text-center">
      <p className="mt-0 mb-1 font-mono text-[11px] tracking-[0.1em] text-blue uppercase">
        {t.switcherTitle}
      </p>
      <p className="mx-auto mt-0 mb-4 max-w-[440px] text-[13px] leading-[1.5] text-ink-dim">
        {t.switcherBlurb}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            aria-pressed={active === key}
            className={
              active === key
                ? 'cursor-pointer rounded-full border-2 border-blue bg-blue px-3.5 py-1.5 text-[12.5px] font-semibold text-white'
                : 'cursor-pointer rounded-full border-2 border-line bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-dim hover:border-blue hover:text-blue'
            }
          >
            {copy.scenarios[key]}
          </button>
        ))}
      </div>
    </div>
  )
}
