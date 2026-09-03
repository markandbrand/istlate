import { SCENARIOS } from '../data/fixtures.js'

/**
 * Selector de escenarios del modo demo.
 *
 * Existe porque sin datos reales no hay forma de provocar una cancelación o
 * un desvío. Cuando el proveedor esté conectado, se quita de aquí y se queda
 * como herramienta interna.
 */
export default function ScenarioSwitcher({ active, onPick }) {
  return (
    <div className="mx-auto mt-2 max-w-[660px] text-center">
      <p className="mt-0 mb-1 font-mono text-[11px] tracking-[0.1em] text-blue uppercase">
        Modo demo · pulsa para ver cada situación
      </p>
      <p className="mx-auto mt-0 mb-4 max-w-[440px] text-[13px] leading-[1.5] text-ink-dim">
        Sin datos reales no hay forma de provocar una cancelación o un desvío, así que aquí
        tienes los diez escenarios que el producto sabe contar.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            aria-pressed={active === s.key}
            className={
              active === s.key
                ? 'cursor-pointer rounded-full border-2 border-blue bg-blue px-3.5 py-1.5 text-[12.5px] font-semibold text-white'
                : 'cursor-pointer rounded-full border-2 border-line bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-dim hover:border-blue hover:text-blue'
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
