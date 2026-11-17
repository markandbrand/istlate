import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { planDeRecogida, sePuedeRecoger } from '../lib/pickup.js'

/** Un retraso por debajo de esto no merece señalarse; es ruido. */
const DESFASE_VISIBLE_MIN = 15
/** Límites razonables para el trayecto que escribe el usuario. */
const TRAYECTO = { min: 1, max: 300 }

/**
 * Modo "Voy a recoger".
 *
 * Tres estados: el botón, las dos preguntas y la respuesta. No se hace nada
 * con la API: todo sale del vuelo que ya está en pantalla, así que responde
 * al instante y funciona igual con datos reales que con los de ejemplo.
 */
export default function PickupMode({ flight }) {
  // `t` es solo la sección ui del diccionario; los textos del modo recoger
  // cuelgan del diccionario entero, igual que los del veredicto.
  const { copy, fmt } = useI18n()
  const c = copy.pickup

  const [abierto, setAbierto] = useState(false)
  const [trayecto, setTrayecto] = useState('')
  const [maleta, setMaleta] = useState(null)
  const [plan, setPlan] = useState(null)

  if (!sePuedeRecoger(flight)) return null

  const minutos = Number(trayecto)
  const valido =
    trayecto !== '' &&
    Number.isFinite(minutos) &&
    minutos >= TRAYECTO.min &&
    minutos <= TRAYECTO.max &&
    maleta !== null

  function calcular() {
    if (!valido) return
    setPlan(planDeRecogida(flight, minutos, maleta))
  }

  function reiniciar() {
    setPlan(null)
    setAbierto(true)
  }

  // 1) Cerrado: solo la invitación.
  if (!abierto) {
    return (
      <div className="mt-4 rounded-card border-2 border-[#c9e3f7] bg-blue-dim p-5 text-center">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="cursor-pointer rounded-xl border-none bg-blue px-6 py-3 font-display text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-in-out hover:-translate-y-px hover:bg-blue-hover"
        >
          🚗 {c.cta}
        </button>
        <p className="mt-3 mb-0 text-[13px] text-ink-dim">{c.blurb}</p>
      </div>
    )
  }

  // 3) Con respuesta.
  if (plan) {
    const tarde = plan.margenMin != null && plan.margenMin < 0
    const titular = plan.salYa
      ? tarde
        ? c.answerLate(Math.abs(plan.margenMin))
        : c.answerNow
      : c.answer(plan.salDeCasa)

    return (
      <div className="mt-4 rounded-card bg-card p-7 shadow-soft">
        <div
          className={`rounded-2xl border-2 px-5 py-5 text-center ${
            plan.salYa
              ? 'border-amber-line bg-[linear-gradient(135deg,var(--color-amber-dim),#fff)]'
              : 'border-[#bfe9d6] bg-[linear-gradient(135deg,var(--color-green-dim),#fff)]'
          }`}
        >
          <div className="mb-1.5 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
            {c.title}
          </div>
          <b
            className={`block font-display text-[clamp(26px,5vw,38px)] leading-[1.15] font-bold ${
              plan.salYa ? 'text-amber-ink' : 'text-green-ink'
            }`}
          >
            {titular}
          </b>
          {!plan.salYa && plan.margenMin != null && (
            <p className="mt-2 mb-0 text-[13px] font-semibold text-ink-dim">
              {c.margin(plan.margenMin)}
            </p>
          )}
        </div>

        <p className="mt-5 mb-0 text-[14.5px] leading-[1.6] text-ink-dim">{c.explain(plan)}</p>

        {plan.desfaseMin >= DESFASE_VISIBLE_MIN && (
          <p className="mt-4 mb-0 rounded-[14px] border-2 border-coral-line bg-coral-dim px-[18px] py-[14px] text-[13.5px] leading-[1.55] font-semibold text-ink">
            {c.gap(plan.desfaseMin, flight.arrival.revised, flight.arrival.predicted)}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 min-[561px]:grid-cols-3">
          {[
            { k: c.travelLabel, v: fmt.duration(plan.trayectoMin) },
            { k: c.bagsLabel, v: plan.conMaleta ? c.bagsYes : c.bagsNo },
            { k: c.terminalLabel, v: fmt.duration(plan.esperaEnTerminal) },
          ].map((card) => (
            <div key={card.k} className="rounded-[14px] border-2 border-line bg-fc px-[18px] py-4">
              <div className="mb-2 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
                {card.k}
              </div>
              <div className="font-mono text-[17px] font-bold">{card.v}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 mb-0 text-[12.5px] leading-[1.55] text-muted">{c.estimateNote}</p>

        <button
          type="button"
          onClick={reiniciar}
          className="mt-4 cursor-pointer border-none bg-transparent p-0 text-[13px] font-semibold text-blue underline underline-offset-[3px]"
        >
          {c.again}
        </button>
      </div>
    )
  }

  // 2) Las dos preguntas.
  return (
    <div className="mt-4 rounded-card bg-card p-7 shadow-soft">
      <p className="mt-0 mb-1 font-display text-[17px] font-bold text-ink">🚗 {c.title}</p>
      <p className="mt-0 mb-5 text-[13.5px] text-ink-dim">{c.blurb}</p>

      <label className="mb-1.5 block text-[13.5px] font-semibold text-ink" htmlFor="pickupTravel">
        {c.travelLabel}
      </label>
      <div className="flex items-center gap-2.5">
        <input
          id="pickupTravel"
          type="number"
          inputMode="numeric"
          min={TRAYECTO.min}
          max={TRAYECTO.max}
          value={trayecto}
          onChange={(e) => setTrayecto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && calcular()}
          placeholder="25"
          className="w-[108px] rounded-xl border-2 border-line bg-card px-[14px] py-2.5 font-mono text-[17px] text-ink placeholder:text-muted"
        />
        <span className="text-[14px] text-ink-dim">{c.travelUnit}</span>
      </div>
      <p className="mt-2 mb-5 text-[12.5px] text-muted">{c.travelHelp}</p>

      <p className="mb-2 text-[13.5px] font-semibold text-ink">{c.bagsLabel}</p>
      <div className="flex flex-wrap gap-2.5">
        {[
          { valor: true, texto: c.bagsYes },
          { valor: false, texto: c.bagsNo },
        ].map((opcion) => (
          <button
            key={opcion.texto}
            type="button"
            onClick={() => setMaleta(opcion.valor)}
            aria-pressed={maleta === opcion.valor}
            className={`cursor-pointer rounded-full border-2 px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors duration-150 ${
              maleta === opcion.valor
                ? 'border-blue bg-blue text-white'
                : 'border-line bg-card text-ink-dim hover:border-[#c9e3f7]'
            }`}
          >
            {opcion.texto}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={calcular}
        disabled={!valido}
        className="mt-6 w-full cursor-pointer rounded-xl border-none bg-coral px-6 py-3 font-display text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-in-out hover:-translate-y-px hover:bg-coral-hover disabled:cursor-not-allowed disabled:bg-muted disabled:hover:translate-y-0"
      >
        {c.submit}
      </button>
    </div>
  )
}
