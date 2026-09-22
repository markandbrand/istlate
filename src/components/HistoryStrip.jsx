/**
 * Tira de puntualidad de los últimos días.
 *
 * Dos estados y no tres: el validador de paletas demuestra que ámbar y coral
 * son indistinguibles para un daltónico (ΔE 2,4 en protanopia), así que la
 * escala se queda en puntual / con retraso, que además es la regla del
 * producto (por debajo de 15 minutos no merece alarmar).
 *
 * Cada día lleva su cifra impresa, de modo que el color solo refuerza: quien
 * no distinga los tonos lee igual el dato.
 */
import { useI18n } from '../i18n/index.jsx'

export default function HistoryStrip({ caption, days, legend }) {
  const { fmt } = useI18n()
  return (
    <div className="mb-2">
      <div className="mb-2 text-[11px] tracking-[0.06em] text-ink-dim uppercase">{caption}</div>

      <div className="flex gap-0.5">
        {days.map((day, i) => (
          <div
            key={day.date ?? i}
            className={`flex-1 rounded-[10px] px-1 py-2.5 text-center ${
              day.onTime ? 'bg-green-dim' : 'bg-coral-dim'
            }`}
          >
            <div className="text-[10.5px] font-semibold text-ink-dim">
              {day.date ? fmt.weekday(day.date) : day.label}
            </div>
            <div
              className={`mt-1 font-mono text-[13px] font-bold tabular-nums ${
                day.onTime ? 'text-green-ink' : 'text-coral-ink'
              }`}
            >
              {day.delayMin === 0 ? '—' : `+${day.delayMin}`}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11.5px] text-ink-dim">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green" />
          {legend.onTime}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-coral" />
          {legend.late}
        </span>
      </div>
    </div>
  )
}
