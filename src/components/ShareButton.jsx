import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'

/**
 * Compartir el vuelo.
 *
 * En el móvil abre el menú del sistema, que es el que lleva a WhatsApp con un
 * toque. Donde eso no existe (casi todo escritorio), copia el enlace al
 * portapapeles y lo dice.
 *
 * Es el motor de crecimiento del producto: quien vuela manda el enlace a quien
 * le espera, y esa persona descubre IsItLate sin que nadie pague publicidad.
 */
export default function ShareButton({ flight }) {
  const { t } = useI18n()
  const [copiado, setCopiado] = useState(false)

  async function compartir() {
    if (typeof window === 'undefined') return
    const url = window.location.href
    const datos = {
      title: `IsItLate? — ${flight.code}`,
      text: t.shareText(flight.code, flight.route.from.city, flight.route.to.city),
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(datos)
        return
      }
    } catch (err) {
      // Cancelar el menú de compartir no es un fallo: no hay nada que decir.
      if (err?.name === 'AbortError') return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin portapapeles (contexto no seguro, permisos) no hay plan C que no
      // sea molestar: la dirección está en la barra del navegador.
    }
  }

  return (
    <button
      type="button"
      onClick={compartir}
      className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-line bg-fc px-5 py-3 font-display text-[14.5px] font-semibold text-ink transition-colors duration-150 hover:border-[#c9e3f7] hover:bg-blue-dim"
    >
      <span aria-hidden="true">{copiado ? '✓' : '🔗'}</span>
      {copiado ? t.shareCopied : t.shareButton}
    </button>
  )
}
