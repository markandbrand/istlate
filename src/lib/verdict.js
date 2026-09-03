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

/** Tramos que el avión aún tiene que volar antes de venir a por ti. */
const legsBefore = (rotation) =>
  rotation.filter((l) => l.state === 'active' || l.state === 'pending').length

/** ¿El avión ya está aparcado en tu aeropuerto? */
function isParked(flight) {
  const before = flight.rotation.filter((l) => l.state !== 'final')
  const last = before[before.length - 1]
  return Boolean(last && last.state === 'done' && last.iata === flight.route.from.iata)
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

  if (status === 'unknown' || !flight.aircraft) return { key: 'unassigned', x: base }

  if (['departed', 'enRoute', 'approaching', 'arrived'].includes(status)) {
    const espera = flight.hasCheckedBags ? PUERTA_MIN.conMaleta : PUERTA_MIN.sinMaleta
    return {
      key: 'gone',
      x: { ...base, landed: status === 'arrived', gateOutAt: plusMinutes(flight.estimate?.from, espera) },
    }
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
 * @param {object} flight  vuelo en la forma interna
 * @param {object} copy    diccionario del idioma activo (src/i18n/<lang>.js)
 */
export function deriveVerdict(flight, copy) {
  const { key, x } = analyse(flight)
  const words = copy.verdict[key](flight, x)
  const buildPanel = copy.panel[key]
  const panel = buildPanel && (key !== 'late' || flight.estimate) ? buildPanel(flight, x) : null
  return { key, tone: TONE_BY_KEY[key], ...words, panel }
}
