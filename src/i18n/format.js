/**
 * Formateadores por idioma.
 *
 * Aquí es donde se nota la diferencia entre traducir y adaptar: un vuelo de
 * las 20:30 en España sale at 8:30 PM en Estados Unidos, y 830 km son
 * 516 millas. Los datos se guardan siempre en formato canónico (hora "HH:MM"
 * de 24 h y kilómetros) y se convierten solo al pintarlos.
 */

const pad = (n) => String(n).padStart(2, '0')

export const FORMATTERS = {
  es: {
    /** 24 h, como en cualquier panel de aeropuerto español. */
    time: (hhmm) => hhmm ?? '—',

    duration(min) {
      if (min == null) return '—'
      if (min < 60) return `${min} min`
      const h = Math.floor(min / 60)
      const m = min % 60
      return m === 0 ? `${h} h` : `${h} h ${m} min`
    },

    distance: (km) => `${km.toLocaleString('es-ES')} km`,

    minutes: (n) => `${n} min`,

    plural: (n, one, many) => `${n} ${n === 1 ? one : many}`,
  },

  en: {
    /** 12 h con AM/PM, que es como lo lee cualquiera en Estados Unidos. */
    time(hhmm) {
      if (!hhmm) return '—'
      const [h, m] = hhmm.split(':').map(Number)
      const period = h < 12 ? 'AM' : 'PM'
      const hour = h % 12 === 0 ? 12 : h % 12
      return `${hour}:${pad(m)} ${period}`
    },

    duration(min) {
      if (min == null) return '—'
      if (min < 60) return `${min} min`
      const h = Math.floor(min / 60)
      const m = min % 60
      return m === 0 ? `${h} hr` : `${h} hr ${m} min`
    },

    /** Millas, que es lo que entiende el público estadounidense. */
    distance: (km) => `${Math.round(km * 0.621371).toLocaleString('en-US')} mi`,

    minutes: (n) => `${n} min`,

    plural: (n, one, many) => `${n} ${n === 1 ? one : many}`,
  },
}
