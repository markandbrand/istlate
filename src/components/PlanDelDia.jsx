import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import PickupMode from './PickupMode.jsx'
import DepartureMode from './DepartureMode.jsx'
import { sePuedeRecoger } from '../lib/pickup.js'
import { sePuedeVolar } from '../lib/salida.js'

/**
 * El selector entre las dos caras de la misma pregunta.
 *
 *   quien vuela  → ¿a qué hora salgo para no perder el vuelo?
 *   quien recoge → ¿a qué hora salgo a buscarle?
 *
 * Van juntos y no como dos botones apilados porque son la misma decisión:
 * "¿y tú qué eres?". Y cada opción solo aparece cuando tiene sentido — a un
 * vuelo que ya ha despegado no le ofrecemos planear la salida de casa.
 */
export default function PlanDelDia({ flight }) {
  const { t } = useI18n()
  const [modo, setModo] = useState(null)

  const puedeVolar = sePuedeVolar(flight)
  const puedeRecoger = sePuedeRecoger(flight)
  if (!puedeVolar && !puedeRecoger) return null

  if (modo === 'volar') return <DepartureMode flight={flight} onVolver={() => setModo(null)} />
  if (modo === 'recoger') return <PickupMode flight={flight} onVolver={() => setModo(null)} />

  const opciones = [
    puedeVolar && { clave: 'volar', emoji: '✈️', texto: t.planFlying },
    puedeRecoger && { clave: 'recoger', emoji: '🚗', texto: t.planPicking },
  ].filter(Boolean)

  return (
    <div className="mt-4 rounded-card border-2 border-[#c9e3f7] bg-blue-dim p-5 text-center">
      <p className="mt-0 mb-4 font-display text-[15px] font-semibold text-ink">{t.planTitle}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {opciones.map((o) => (
          <button
            key={o.clave}
            type="button"
            onClick={() => setModo(o.clave)}
            className="cursor-pointer rounded-xl border-none bg-blue px-[22px] py-3 font-display text-[14.5px] font-semibold text-white transition-[background-color,transform] duration-150 ease-in-out hover:-translate-y-px hover:bg-blue-hover"
          >
            {o.emoji} {o.texto}
          </button>
        ))}
      </div>
      <p className="mt-3 mb-0 text-[13px] text-ink-dim">{t.planBlurb}</p>
    </div>
  )
}
