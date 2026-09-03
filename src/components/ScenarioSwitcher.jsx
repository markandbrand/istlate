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
    <div className="mx-auto mt-7 max-w-[640px] text-center">
      <p className="mt-0 mb-3 font-mono text-[11px] tracking-[0.1em] text-ink-dim uppercase">
        Modo demo · mira cada escenario
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
