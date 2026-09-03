/**
 * El veredicto es la respuesta a "¿va a llegar tarde tu avión?".
 *
 * Traduce el estado crudo del proveedor + la rotación del avión a una
 * respuesta humana: un tono, un titular, una explicación y —cuando podemos—
 * un consejo accionable ("no salgas de casa antes de las X").
 *
 * Regla de tono del producto: el humor es inversamente proporcional a la
 * gravedad. Se bromea cuando todo va bien, se es plano cuando va mal, y se es
 * útil de verdad cuando hay una cancelación.
 */

/** Minutos por debajo de los cuales un retraso es ruido y no merece alarmar. */
const RUIDO_MIN = 15
/** A partir de aquí el retraso te cambia los planes. */
const GRAVE_MIN = 45
/** Escala por debajo de la cual el avión no tiene margen para recuperar. */
const ESCALA_JUSTA_MIN = 35

const plural = (n, singular, plural_) => `${n} ${n === 1 ? singular : plural_}`

/** Resta minutos a una hora "hh:mm" y la devuelve en el mismo formato. */
export function minusMinutes(hhmm, minutes) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h * 60 + m - minutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Tramos que el avión aún tiene que volar antes de venir a por ti. */
function legsBefore(rotation) {
  return rotation.filter((l) => l.state === 'active' || l.state === 'pending').length
}

/** ¿El avión ya está aparcado en tu aeropuerto? */
function isParked(flight) {
  const yourAirport = flight.route.from.iata
  const before = flight.rotation.filter((l) => l.state !== 'final')
  const last = before[before.length - 1]
  return Boolean(last && last.state === 'done' && last.iata === yourAirport)
}

/** Salida efectiva: la revisada por la aerolínea si existe, si no la programada. */
export function effectiveDeparture(flight) {
  return flight.departure.revised ?? flight.departure.scheduled
}

export function deriveVerdict(flight) {
  const { status, rotation, delayMin } = flight
  const pending = legsBefore(rotation)
  const salida = effectiveDeparture(flight)

  // ── Sin avión asignado ────────────────────────────────────────────
  if (status === 'unknown' || !flight.aircraft) {
    if (status === 'canceled' || status === 'canceledUncertain') {
      // cae a los bloques de abajo
    } else {
      return {
        key: 'unassigned',
        tone: 'blue',
        badge: 'Todavía no se sabe',
        emoji: '🕐',
        title: 'Aún no sabemos qué avión te toca',
        text: `La aerolínea todavía no ha asignado avión a este vuelo. Suele saberse unas horas antes de la salida, así que vuelve más tarde y te contamos por dónde anda.`,
        advice: 'Te avisamos en cuanto se sepa, si nos dejas tu email.',
      }
    }
  }

  // ── Malas noticias: sin bromas ────────────────────────────────────
  if (status === 'canceled') {
    return {
      key: 'canceled',
      tone: 'alert',
      badge: 'Cancelado',
      emoji: null,
      title: 'Tu vuelo está cancelado',
      text: `La aerolínea ha cancelado el ${flight.code} de las ${flight.departure.scheduled}. Contacta con ellos para que te reubiquen: tienen que ofrecerte transporte alternativo o el reembolso.`,
      advice:
        'Si te lo han comunicado con menos de 14 días de antelación, el reglamento europeo 261/2004 puede darte derecho a una compensación además del reembolso.',
    }
  }

  if (status === 'canceledUncertain') {
    return {
      key: 'canceledUncertain',
      tone: 'alert',
      badge: 'Podría estar cancelado',
      emoji: null,
      title: 'Nos consta como cancelado, pero sin confirmar',
      text: `Tenemos señales de que el ${flight.code} se ha cancelado, pero la aerolínea aún no lo ha confirmado oficialmente. No queremos darte un susto en falso ni dejarte tirado.`,
      advice: 'Llama a la aerolínea antes de salir hacia el aeropuerto.',
    }
  }

  if (status === 'diverted') {
    return {
      key: 'diverted',
      tone: 'amber',
      badge: 'Avión desviado',
      emoji: '↩️',
      title: 'Tu avión se ha desviado por el camino',
      text: `El avión que tiene que operar tu vuelo ha acabado en otro aeropuerto y todavía tiene que llegar hasta aquí. Esto se traduce en un retraso largo: ya lleva ${plural(delayMin, 'minuto', 'minutos')} acumulados.`,
      advice: `La aerolínea ha revisado la salida a las ${salida}. Confírmalo antes de ir.`,
    }
  }

  // ── El vuelo ya salió: cambia la pregunta ─────────────────────────
  if (['departed', 'enRoute', 'approaching', 'arrived'].includes(status)) {
    const llegada = flight.estimate
      ? `Aterriza sobre las ${flight.estimate.from}`
      : 'Ya está en el aire'
    const yaLlego = status === 'arrived'
    return {
      key: 'gone',
      tone: 'slate',
      badge: yaLlego ? 'Ya aterrizó' : 'Ya ha salido',
      emoji: yaLlego ? '🛬' : '✈️',
      title: yaLlego ? 'Este vuelo ya ha aterrizado' : 'Este vuelo ya ha salido',
      text: yaLlego
        ? `El ${flight.code} ya está en tierra. Si vienes a recoger a alguien, ya puedes ir bajando.`
        : `Salió a las ${salida}${delayMin > 0 ? ` (${plural(delayMin, 'minuto', 'minutos')} tarde)` : ''}. ${llegada}.`,
      advice: null,
    }
  }

  // ── El avión ya está en tu aeropuerto: la mejor noticia posible ───
  if (isParked(flight)) {
    const primero = rotation.length === 2 && rotation[0].state === 'done'
    if (primero) {
      return {
        key: 'overnight',
        tone: 'green',
        badge: 'En hora',
        emoji: '😴',
        title: 'Tu avión ha dormido aquí',
        text: `Es el primer vuelo del día de este avión, así que no arrastra retrasos de nadie. Es lo más parecido a una garantía que existe en aviación.`,
        advice: `Sal de casa con el tiempo de siempre: la salida de las ${salida} va a misa.`,
      }
    }
    return {
      key: 'parked',
      tone: 'green',
      badge: 'En hora',
      emoji: '🛬',
      title: 'Tu avión ya está aquí, aparcado',
      text: `Ya ha llegado a ${flight.route.from.city} y le sobra tiempo antes de salir contigo. No depende de ningún vuelo anterior: lo único que falta es que lo preparen.`,
      advice: `Puedes ir al aeropuerto con tu rutina normal para la salida de las ${salida}.`,
    }
  }

  // ── Todavía viene de camino: aquí decide la rotación ──────────────
  const escalaJusta = flight.turnaroundMin != null && flight.turnaroundMin < ESCALA_JUSTA_MIN

  if (delayMin >= GRAVE_MIN || (pending >= 2 && delayMin >= RUIDO_MIN)) {
    const rango = flight.estimate ? `${flight.estimate.from} – ${flight.estimate.to}` : null
    return {
      key: 'late',
      tone: 'coral',
      badge: 'Probablemente sí',
      emoji: '✈️',
      title: 'Spoiler: puede que vaya con retraso',
      text: `Tu avión todavía tiene ${plural(pending, 'tramo', 'tramos')} por delante antes de venir a por ti, y ya lleva ${plural(delayMin, 'minuto', 'minutos')} de retraso acumulado hoy.`,
      advice: rango
        ? `Nuestra estimación es que saldrás entre las ${rango}. No hace falta que estés en el aeropuerto antes de las ${minusMinutes(flight.estimate.from, 75)}.`
        : null,
    }
  }

  if (delayMin >= RUIDO_MIN || escalaJusta) {
    const motivo = escalaJusta
      ? `la escala aquí es de solo ${plural(flight.turnaroundMin, 'minuto', 'minutos')}, que da muy poco margen`
      : `arrastra ${plural(delayMin, 'minuto', 'minutos')} de retraso`
    return {
      key: 'risk',
      tone: 'amber',
      badge: 'Puede torcerse',
      emoji: '🤔',
      title: 'De momento bien, pero yo lo vigilaría',
      text: `Tu avión viene de camino y ${motivo}. Nada dramático todavía, pero es de esos que se tuercen en el último momento.`,
      advice: `Vuelve a mirarlo antes de salir de casa hacia las ${minusMinutes(salida, 150)}.`,
    }
  }

  const margen =
    flight.turnaroundMin != null
      ? ` Le quedan ${plural(flight.turnaroundMin, 'minuto', 'minutos')} de escala aquí, de sobra para dar la vuelta.`
      : ''
  const enCamino = rotation.find((l) => l.state === 'active')
  return {
    key: 'onTime',
    tone: 'green',
    badge: 'En hora',
    emoji: '👌',
    title: 'Todo apunta a que sales a tu hora',
    text: `Tu avión viene${enCamino ? ` de ${enCamino.airport}` : ''} sin retrasos que arrastrar.${margen}`,
    advice: `Sal de casa con tu rutina de siempre para la salida de las ${salida}.`,
  }
}
