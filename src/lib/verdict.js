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

/** Minutos entre dos horas "hh:mm", cruzando medianoche si hace falta. */
export function minutesBetween(from, to) {
  if (!from || !to) return null
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = toMin(to) - toMin(from)
  if (diff < 0) diff += 1440
  return diff
}

/** Suma minutos a una hora "hh:mm". */
export function plusMinutes(hhmm, minutes) {
  return minusMinutes(hhmm, -minutes)
}

/** 115 → "1 h 55 min" */
export function humanDuration(min) {
  if (min == null) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/**
 * Compensación orientativa del reglamento (CE) 261/2004 por distancia.
 * Es orientativa a propósito: no se cobra si la causa es una circunstancia
 * extraordinaria, y el aviso con más de 14 días de antelación también la anula.
 */
export function compensation(km) {
  if (km == null) return null
  if (km <= 1500) return '250 €'
  if (km <= 3500) return '400 €'
  return '600 €'
}

/**
 * El panel es el bloque de datos del final de la tarjeta. Cada estado enseña
 * el dato que de verdad se está preguntando quien mira esa pantalla, no un
 * relleno: cuánto lleva el avión esperándote, cuánto margen tiene la escala,
 * a qué hora sale tu amigo por la puerta de llegadas.
 */
function buildPanel(flight, key) {
  const salida = effectiveDeparture(flight)

  switch (key) {
    case 'parked': {
      const espera = minutesBetween(flight.parkedSince, salida)
      return {
        label: '☕ Mientras tanto',
        cards: [
          { k: 'Aparcado desde', v: flight.parkedSince },
          { k: 'Lleva esperándote', v: humanDuration(espera), accent: true },
        ],
        note: 'Tu avión está echando la siesta en la puerta. Es la mejor noticia que te podemos dar.',
      }
    }

    case 'overnight':
      return {
        label: '🌙 Herencia del día anterior',
        cards: [
          { k: 'La última vez que voló', v: flight.lastFlewAt },
          { k: 'Retraso que hereda', v: 'Ninguno', accent: true },
        ],
        note: 'Todo el lío de ayer se quedó en ayer. Tu avión empieza el día de cero, y contigo.',
      }

    case 'onTime': {
      const necesita = flight.minTurnaroundMin
      const tiene = flight.turnaroundMin
      if (necesita == null || tiene == null) return null
      return {
        label: '⏱️ El margen que tiene',
        cards: [
          { k: 'Necesita para dar la vuelta', v: `${necesita} min` },
          { k: 'Tiene', v: `${tiene} min`, accent: true },
        ],
        note: `Le sobran ${tiene - necesita} minutos. Da tiempo a limpiar la cabina, repostar y hasta a que el piloto se tome un café.`,
      }
    }

    case 'risk':
      return {
        label: '👀 El número a vigilar',
        cards: [
          { k: 'Si aterriza antes de', v: flight.tippingPoint },
          { k: 'Sales a tu hora', v: salida, accent: true },
        ],
        note: 'Ese es el momento exacto en el que se decide tu tarde. Nosotros lo miramos por ti.',
      }

    case 'late':
      if (!flight.estimate) return null
      return {
        label: '🔮 Nuestra previsión',
        cards: [
          { k: 'Dice la aerolínea', v: salida },
          { k: 'Nuestra estimación', v: `${flight.estimate.from} – ${flight.estimate.to}`, accent: true },
        ],
        note: null,
      }

    case 'canceledUncertain':
      return {
        label: '📡 Cómo de fresco es esto',
        cards: [
          { k: 'Última comprobación', v: `hace ${flight.lastCheckedMin} min` },
          { k: 'Estado oficial', v: 'Sin confirmar', accent: true },
        ],
        note: 'Preferimos decirte que no lo sabemos seguro antes que darte un susto en falso o dejarte tirado en el aeropuerto.',
      }

    case 'diverted':
      return {
        label: '🗺️ La vuelta que ha dado',
        cards: [
          { k: 'Kilómetros de más', v: `${flight.extraKm} km` },
          { k: 'Nueva salida', v: salida, accent: true },
        ],
        note: 'Tu avión ha hecho turismo sin ti. Nadie te lo iba a contar tan claro.',
      }

    case 'unassigned':
      return {
        label: '🕐 Cuándo volver a mirar',
        cards: [
          { k: 'Se suele saber sobre las', v: flight.knownBy },
          { k: 'Salida prevista', v: salida, accent: true },
        ],
        note: 'No te hacemos perder el tiempo recargando: déjanos el email y te escribimos en cuanto haya avión.',
      }

    case 'canceled': {
      const importe = compensation(flight.distanceKm)
      if (!importe) return null
      return {
        label: '⚖️ Lo que te pueden deber',
        cards: [
          { k: 'Distancia del vuelo', v: `${flight.distanceKm.toLocaleString('es-ES')} km` },
          { k: 'Compensación orientativa', v: importe, accent: true },
        ],
        note: 'Orientativo: no se cobra si la causa es una circunstancia extraordinaria (temporal, huelga de control aéreo) ni si te avisaron con más de 14 días. El reembolso del billete sí te corresponde siempre.',
      }
    }

    case 'gone': {
      const aterriza = flight.estimate?.from
      if (!aterriza) return null
      const puerta = plusMinutes(aterriza, flight.hasCheckedBags ? 45 : 20)
      return {
        label: '🚪 Si vienes a recoger a alguien',
        cards: [
          { k: 'Aterriza sobre las', v: aterriza },
          { k: 'Sale por la puerta a las', v: puerta, accent: true },
        ],
        note: 'Aterrizar no es salir: hay que rodar, desembarcar y cruzar la terminal. Suma 25 minutos más si lleva maleta facturada.',
      }
    }

    default:
      return null
  }
}

export function deriveVerdict(flight) {
  const verdict = computeVerdict(flight)
  return { ...verdict, panel: buildPanel(flight, verdict.key) }
}

function computeVerdict(flight) {
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
        'Guarda la tarjeta de embarque y los emails de la aerolínea: es lo primero que te piden si reclamas.',
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
