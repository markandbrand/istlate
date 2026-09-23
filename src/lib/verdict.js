/**
 * El veredicto es la respuesta a "¿va a llegar tarde tu avión?".
 *
 * Este archivo decide QUÉ estado aplica y calcula los números; los textos
 * viven en src/i18n/<idioma>.js. Así la lógica se escribe una vez y añadir un
 * idioma es solo escribir copy, sin tocar reglas de negocio.
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
/** Antelación con la que recomendamos plantarse en el aeropuerto. */
const ANTELACION_MIN = 75
/** Cuánto antes de salir de casa conviene volver a mirar un vuelo en riesgo. */
const REVISION_MIN = 150
/** Del aterrizaje a cruzar la puerta de llegadas, con y sin maleta facturada. */
const PUERTA_MIN = { sinMaleta: 20, conMaleta: 45 }

export const TONE_BY_KEY = {
  parked: 'green',
  overnight: 'green',
  onTime: 'green',
  risk: 'amber',
  diverted: 'amber',
  late: 'coral',
  canceled: 'alert',
  canceledUncertain: 'alert',
  unassigned: 'blue',
  gone: 'slate',
  boarding: 'blue',
}

/** Resta minutos a una hora "hh:mm" y la devuelve en el mismo formato. */
export function minusMinutes(hhmm, minutes) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h * 60 + m - minutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const plusMinutes = (hhmm, minutes) => minusMinutes(hhmm, -minutes)

/** Minutos entre dos horas "hh:mm", cruzando medianoche si hace falta. */
export function minutesBetween(from, to) {
  if (!from || !to) return null
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = toMin(to) - toMin(from)
  if (diff < 0) diff += 1440
  return diff
}

/**
 * Compensación del reglamento (CE) 261/2004 por tramos de distancia.
 * Solo aplica en Europa: Estados Unidos no tiene equivalente, y por eso el
 * panel en inglés habla del reembolso automático del DOT en su lugar.
 */
export function compensation(km) {
  if (km == null) return null
  if (km <= 1500) return '250 €'
  if (km <= 3500) return '400 €'
  return '600 €'
}

/** Salida efectiva: la revisada por la aerolínea si existe, si no la programada. */
export const effectiveDeparture = (flight) =>
  flight.departure.revised ?? flight.departure.scheduled

/**
 * Porcentaje del vuelo recorrido, medido en tiempo.
 *
 * Se apoya en dos datos que ya teníamos: la hora real de despegue y la
 * predicción de llegada. Los fixtures pueden fijarlo a mano porque sus horas
 * no llevan fecha y compararlas con el reloj real daría cualquier cosa.
 */
function flightProgress(flight, now = new Date()) {
  if (flight.progressPct != null) return flight.progressPct
  const salida = flight.departure?.revised ?? flight.departure?.scheduled
  const llegada = flight.arrival?.predicted ?? flight.arrival?.revised ?? flight.arrival?.scheduled
  const total = minutesBetween(salida, llegada)
  if (!total) return null
  const ahora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const transcurrido = minutesBetween(salida, ahora)
  if (transcurrido == null) return null
  return Math.min(100, Math.max(0, Math.round((transcurrido / total) * 100)))
}

/** Cuánto se desvía la predicción de llegada respecto a lo que dice la aerolínea. */
function predictedDelay(flight) {
  const { revised, scheduled, predicted } = flight.arrival ?? {}
  const referencia = revised ?? scheduled
  if (!referencia || !predicted) return 0
  return Math.max(0, minutesBetween(referencia, predicted) ?? 0)
}

/** Tramos que el avión aún tiene que volar antes de venir a por ti. */
const legsBefore = (rotation) =>
  rotation.filter((l) => l.state === 'active' || l.state === 'pending').length

/** ¿El avión ya está aparcado en tu aeropuerto? */
function isParked(flight) {
  const before = flight.rotation.filter((l) => l.state !== 'final')
  const last = before[before.length - 1]
  return Boolean(last && last.state === 'done' && last.iata === flight.route.from.iata)
}

/**
 * Resumen del historial del número de vuelo.
 *
 * Dos niveles y no tres a propósito: el validador de paletas demuestra que
 * ámbar y coral son indistinguibles para un daltónico (ΔE 2,4), y además
 * coincide con la regla del producto: por debajo de RUIDO_MIN el retraso no
 * merece alarmar. Cada día lleva además su cifra, así que el color nunca es
 * la única señal.
 */
function trackRecord(history) {
  if (!history?.length) return {}
  const enHora = history.filter((d) => d.delayMin < RUIDO_MIN).length
  const total = history.reduce((sum, d) => sum + d.delayMin, 0)
  return {
    punctuality: Math.round((enHora / history.length) * 100),
    avgDelay: Math.round(total / history.length),
    days: history.map((d) => ({ ...d, onTime: d.delayMin < RUIDO_MIN })),
  }
}

/** Decide el estado y calcula los números que el texto necesita. */
function analyse(flight) {
  const departure = effectiveDeparture(flight)
  const pending = legsBefore(flight.rotation)
  const inbound = flight.rotation.find((l) => l.state === 'active')
  const base = { departure, pending, inboundFrom: inbound?.airport ?? null }

  const { status } = flight

  if (status === 'canceled') return { key: 'canceled', x: { ...base, compensation: compensation(flight.distanceKm) } }
  if (status === 'canceledUncertain') return { key: 'canceledUncertain', x: base }
  if (status === 'diverted') return { key: 'diverted', x: base }

  // La FASE del vuelo manda sobre todo lo demás. Un vuelo embarcando o ya en
  // el aire es eso, se pueda o no seguir el rastro del avión: verificado que
  // el proveedor no da matrícula ni Mode-S ni con la puerta ya cerrada, así
  // que preguntar antes por la trazabilidad mandaba estos vuelos al estado
  // "todavía no sabemos qué avión te toca", que es justo lo que no importa
  // cuando estás embarcando.
  // Facturando, embarcando o con la puerta cerrada: el vuelo está a punto de
  // salir. Verificado que ocurre de verdad (estado GateClosed en un vuelo real
  // a minutos de empujar), y hasta ahora caía en "no sabemos qué avión te
  // toca", que es la peor respuesta posible en ese momento.
  if (['checkIn', 'boarding', 'gateClosed'].includes(status)) {
    const desvio = predictedDelay(flight)
    return {
      key: 'boarding',
      x: { ...base, phase: status, predictedDelayMin: desvio, tone: desvio >= RUIDO_MIN ? 'amber' : 'green' },
    }
  }

  if (['departed', 'enRoute', 'approaching', 'arrived'].includes(status)) {
    const espera = flight.hasCheckedBags ? PUERTA_MIN.conMaleta : PUERTA_MIN.sinMaleta
    return {
      key: 'gone',
      x: {
        ...base,
        landed: status === 'arrived',
        gateOutAt: plusMinutes(flight.estimate?.from, espera),
        progressPct: status === 'arrived' ? 100 : flightProgress(flight),
      },
    }
  }

  // Para un vuelo que aún no se ha movido, sí decide la trazabilidad: sin
  // matrícula ni Mode-S no hay rotación que reconstruir, y eso es lo que
  // devuelve el proveedor hasta que el avión despega. Saber el modelo no basta.
  // Saber el modelo no basta: sin matrícula ni Mode-S no hay rotación que
  // contar, y eso es exactamente lo que devuelve el proveedor a 8 h de la
  // salida. Por eso se pregunta por la trazabilidad, no por si hay avión.
  const traceable = Boolean(flight.aircraft?.reg || flight.aircraft?.modeS)
  if (status === 'unknown' || !traceable) {
    return { key: 'unassigned', x: { ...base, ...trackRecord(flight.history) } }
  }

  if (isParked(flight)) {
    const primeroDelDia = flight.rotation.length === 2 && flight.rotation[0].state === 'done'
    if (primeroDelDia) return { key: 'overnight', x: base }
    return { key: 'parked', x: { ...base, waitingMin: minutesBetween(flight.parkedSince, departure) } }
  }

  const escalaJusta = flight.turnaroundMin != null && flight.turnaroundMin < ESCALA_JUSTA_MIN

  if (flight.delayMin >= GRAVE_MIN || (pending >= 2 && flight.delayMin >= RUIDO_MIN)) {
    return { key: 'late', x: { ...base, leaveBy: minusMinutes(flight.estimate?.from, ANTELACION_MIN) } }
  }

  if (flight.delayMin >= RUIDO_MIN || escalaJusta) {
    return {
      key: 'risk',
      x: { ...base, tightTurnaround: escalaJusta, checkBackAt: minusMinutes(departure, REVISION_MIN) },
    }
  }

  return { key: 'onTime', x: base }
}

/**
 * Datos que necesita el panel de cada estado.
 *
 * Los fixtures los traen todos; una respuesta real, de momento, casi ninguno
 * (los vamos calculando). Sin esta comprobación, un campo ausente reventaba la
 * tarjeta entera en vez de limitarse a no pintar el panel.
 */
const PANEL_REQUIERE = {
  parked: (fl, x) => x.waitingMin != null,
  overnight: (fl) => Boolean(fl.lastFlewAt),
  onTime: (fl) => fl.minTurnaroundMin != null && fl.turnaroundMin != null,
  risk: (fl) => Boolean(fl.tippingPoint),
  late: (fl) => Boolean(fl.estimate),
  diverted: (fl) => fl.extraKm != null,
  unassigned: (fl, x) => Boolean(x.days?.length),
  canceledUncertain: (fl) => fl.lastCheckedMin != null,
  canceled: () => true,
  gone: (fl) => Boolean(fl.estimate),
  boarding: (fl) => Boolean(fl.arrival?.predicted),
}

/**
 * @param {object} flight  vuelo en la forma interna
 * @param {object} copy    diccionario del idioma activo (src/i18n/<lang>.js)
 */
export function deriveVerdict(flight, copy) {
  const { key, x } = analyse(flight)
  const words = copy.verdict[key](flight, x)
  // Algunos estados eligen su tono según los datos, no solo según el estado.
  const tone = x.tone ?? TONE_BY_KEY[key]
  return { key, tone, ...words, progress: x.progressPct ?? null, panel: buildPanelSafely(flight, x, key, copy) }
}

/**
 * El panel es información de apoyo: si le falta un dato, se calla. Nunca debe
 * tumbar la tarjeta, que es lo que el usuario ha venido a leer.
 */
function buildPanelSafely(flight, x, key, copy) {
  const build = copy.panel[key]
  const requisito = PANEL_REQUIERE[key]
  if (!build || (requisito && !requisito(flight, x))) return null
  try {
    return build(flight, x)
  } catch (err) {
    console.warn(`[isitlate] no se pudo construir el panel "${key}":`, err)
    return null
  }
}
