import PlaneIcon from './PlaneIcon.jsx'

/**
 * Por dónde va el avión, en porcentaje.
 *
 * El porcentaje sale del TIEMPO transcurrido, no de la distancia: un vuelo no
 * avanza de forma lineal (rodaje, subida, descenso), así que el texto habla de
 * tiempo de vuelo y no de kilómetros. Prometer distancia con este cálculo
 * sería mentir con precisión falsa.
 *
 * El dato ya lo teníamos: hora real de despegue y predicción de llegada.
 * No hace falta ninguna consulta nueva.
 */
export default function FlightProgress({ from, to, pct, label }) {
  const clamped = Math.min(100, Math.max(0, pct))

  return (
    <div className="mb-[26px]">
      <div className="mb-2.5 flex items-center gap-3">
        <span className="font-mono text-[12.5px] font-semibold text-ink-dim">{from}</span>

        <div
          className="relative h-1.5 flex-1 rounded-full bg-line"
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-blue"
            style={{ width: `${clamped}%` }}
          />
          <div
            className="absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-blue-dim bg-white shadow-soft"
            style={{ left: `${clamped}%` }}
          >
            <PlaneIcon size={15} className="rotate-90" />
          </div>
        </div>

        <span className="font-mono text-[12.5px] font-semibold text-ink-dim">{to}</span>
      </div>

      <p className="mt-0 mb-0 text-center text-[13px] text-ink-dim">{label}</p>
    </div>
  )
}
