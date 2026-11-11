/**
 * Traduce la respuesta de AeroDataBox a la forma interna de la app.
 *
 * Los nombres de campo salen del esquema OpenAPI de AeroDataBox:
 *   FlightContract                  → number, status, aircraft, airline,
 *                                     departure, arrival, callSign, location
 *   FlightAircraftContract          → reg, modeS, model, image
 *   FlightAirportMovementContract   → airport, scheduledTime, revisedTime,
 *                                     runwayTime, terminal, gate, checkInDesk,
 *                                     baggageBelt, quality
 *
 * OJO: los nombres están verificados, pero el anidamiento exacto de los
 * objetos de tiempo no. AeroDataBox devuelve las horas como objetos
 * { utc, local }; `hhmm()` es tolerante a varias formas para que una
 * sorpresa en el formato no tumbe la página. Compara con una respuesta real
 * en su playground antes de dar esto por bueno.
 */

/** Los estados que entiende el motor de veredicto. */
const ESTADOS = new Set([
  'expected', 'checkIn', 'boarding', 'gateClosed', 'departed', 'enRoute',
  'approaching', 'arrived', 'delayed', 'diverted', 'canceled',
  'canceledUncertain', 'unknown',
])

/**
 * AeroDataBox devuelve el estado en PascalCase ("Arrived", "CanceledUncertain")
 * mientras que su esquema lo documenta en camelCase. Verificado contra una
 * respuesta real: sin esta normalización el motor no reconocía ni un estado y
 * todos los vuelos acababan en "todavía no sabemos qué avión te toca".
 */
export function normalizeStatus(raw) {
  if (!raw) return 'unknown'
  const key = raw.charAt(0).toLowerCase() + raw.slice(1)
  return ESTADOS.has(key) ? key : 'unknown'
}

/** Extrae "hh:mm" de un tiempo de AeroDataBox ({ local, utc } o string). */
export function hhmm(time) {
  if (!time) return null
  const raw = typeof time === 'string' ? time : (time.local ?? time.utc)
  if (!raw) return null
  const match = String(raw).match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : null
}

/** Diferencia en minutos entre la hora revisada y la programada. */
export function delayMinutes(movement) {
  const scheduled = hhmm(movement?.scheduledTime)
  const revised = hhmm(movement?.revisedTime) ?? hhmm(movement?.runwayTime)
  if (!scheduled || !revised) return 0
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = toMin(revised) - toMin(scheduled)
  if (diff < -720) diff += 1440 // cruce de medianoche
  if (diff > 720) diff -= 1440
  return Math.max(0, diff)
}

/** Cuánto se desvía la predicción del proveedor respecto a lo programado. */
export function predictedDelay(movement) {
  const scheduled = hhmm(movement?.scheduledTime)
  const predicted = hhmm(movement?.predictedTime)
  if (!scheduled || !predicted) return 0
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = toMin(predicted) - toMin(scheduled)
  if (diff < -720) diff += 1440
  if (diff > 720) diff -= 1440
  return Math.max(0, diff)
}

/** Suma (o resta, en negativo) minutos a un "HH:MM", cruzando medianoche. */
function shift(time, mins) {
  if (!time) return null
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + mins + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Cuánto se abre la ventana por delante y por detrás, en minutos. */
const MARGEN_TEMPRANO_MIN = 5
const MARGEN_TARDIO_MIN = 15
const VENTANA_LLEGADA_MIN = 10

/**
 * Nuestra estimación: la franja horaria que de verdad le importa al usuario.
 *
 * No es la hora que publica la aerolínea. Sale de cruzar lo que la aerolínea
 * promete con la predicción propia del proveedor, que es donde vive el valor
 * del producto: en los dos vuelos medidos las dos no coincidían, por 23 y 24
 * minutos.
 *
 * Qué franja se devuelve depende de dónde está el vuelo:
 *   · todavía en tierra → franja de SALIDA, que es la que decide a qué hora
 *     salir de casa;
 *   · ya en el aire o aterrizado → franja de LLEGADA, que es la que decide a
 *     qué hora salir a recoger a alguien.
 *
 * `from` es siempre lo más temprano plausible y `to` lo más tardío, y ese
 * orden importa: quien lo lee decide cuándo salir de casa. Pasarse por abajo
 * hace esperar un rato; pasarse por arriba hace perder el vuelo.
 */
export function buildEstimate(flight, status) {
  const volando = ['departed', 'enRoute', 'approaching', 'arrived'].includes(status)

  if (volando) {
    // En el aire lo único que importa es cuándo toca tierra, y ahí la
    // predicción del proveedor manda sobre la hora revisada de la aerolínea.
    const from =
      hhmm(flight.arrival?.predictedTime) ??
      hhmm(flight.arrival?.revisedTime) ??
      hhmm(flight.arrival?.scheduledTime)
    return from ? { from, to: shift(from, VENTANA_LLEGADA_MIN) } : null
  }

  const anchor = hhmm(flight.departure?.revisedTime) ?? hhmm(flight.departure?.scheduledTime)
  if (!anchor) return null

  // Todo el cálculo va en minutos relativos al ancla, nunca comparando horas
  // como texto: un vuelo de las 23:50 cruza la medianoche y "00:05" es MAYOR
  // que "23:50" aunque como cadena parezca menor.
  //
  // Si la predicción de llegada apunta a más retraso del que la aerolínea ya
  // admite, ese desfase estira el extremo TARDÍO, nunca el temprano: no
  // vamos a prometer una salida más pronta de la que está publicada.
  const yaAdmitido = delayMinutes(flight.departure)
  const previsto = predictedDelay(flight.arrival)
  const margenTardio = Math.max(MARGEN_TARDIO_MIN, previsto - yaAdmitido)

  return {
    from: shift(anchor, -MARGEN_TEMPRANO_MIN),
    to: shift(anchor, margenTardio),
  }
}

const city = (movement) =>
  movement?.airport?.municipalityName ?? movement?.airport?.shortName ?? movement?.airport?.name ?? '—'
const iata = (movement) => movement?.airport?.iata ?? movement?.airport?.icao ?? '—'

/**
 * Construye la rotación: los tramos que el avión vuela hoy antes del tuyo.
 *
 * @param {object} yourFlight  el vuelo del usuario (FlightContract)
 * @param {object[]} aircraftFlights  vuelos de esa matrícula hoy (getFlight por `reg`)
 */
export function buildRotation(yourFlight, aircraftFlights = []) {
  const yourNumber = yourFlight.number
  const previous = aircraftFlights.filter((f) => f.number !== yourNumber)

  const legs = previous.map((f) => {
    const estado = normalizeStatus(f.status)
    const salido = ['departed', 'enRoute', 'approaching'].includes(estado)
    const llegado = estado === 'arrived'
    const state = llegado ? 'done' : salido ? 'active' : 'pending'
    const delay = delayMinutes(f.departure)

    // La etiqueta va estructurada, no como texto: la escribe el idioma activo
    // (copy.tag en src/i18n/<lang>.js). Antes salía en español fijo, lo que
    // además de romper el inglés dejaba la etiqueta vacía, porque Rotation.jsx
    // busca `tag.kind` y en una cadena no existe.
    const tag = llegado
      ? { kind: 'landed', time: hhmm(f.arrival?.revisedTime ?? f.arrival?.scheduledTime) }
      : salido
        ? { kind: 'inFlight' }
        : { kind: 'pending' }

    return { airport: city(f.arrival), iata: iata(f.arrival), state, tag, delayMin: delay }
  })

  legs.push({
    airport: city(yourFlight.arrival),
    iata: iata(yourFlight.arrival),
    state: 'final',
    tag: { kind: 'yourFlight' },
  })

  return legs
}

/**
 * Historial de puntualidad del número de vuelo.
 *
 * Entra la respuesta del endpoint de rango (un vuelo por día) y sale lo que
 * pinta la tira: una fecha y el retraso de salida de ese día. La fecha se
 * guarda cruda y el idioma decide cómo escribir el día de la semana.
 *
 * Verificado contra siete días reales de IB 1082 (VLC→MAD): 71 % de salidas
 * puntuales y +10 min de media.
 */
export function buildHistory(rangeFlights = []) {
  return rangeFlights
    .map((f) => ({
      date: hhmmDate(f.departure?.scheduledTime),
      delayMin: delayMinutes(f.departure),
    }))
    .filter((d) => d.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Extrae "YYYY-MM-DD" de un tiempo de AeroDataBox. */
export function hhmmDate(time) {
  if (!time) return null
  const raw = typeof time === 'string' ? time : (time.local ?? time.utc)
  const match = String(raw ?? '').match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/** Retraso acumulado del avión hoy: el peor de sus tramos con datos. */
export function accumulatedDelay(aircraftFlights = []) {
  return aircraftFlights.reduce((max, f) => Math.max(max, delayMinutes(f.departure)), 0)
}

/**
 * El retraso que se le enseña al usuario.
 *
 * Son dos fuentes y hacen falta las dos:
 *   · lo que la aerolínea ya ha publicado para TU vuelo (hora revisada frente
 *     a la programada);
 *   · lo que arrastra el avión en sus tramos anteriores, que avisa de un
 *     retraso que viene de camino y que todavía no han aplicado a tu vuelo.
 *
 * Antes solo se miraba la segunda, y la rotación está vacía siempre que no
 * hay matrícula, o sea casi siempre antes de despegar. Un vuelo con una hora
 * de retraso publicada salía como "sin retraso", que es justo la respuesta
 * que no puede fallar.
 */
export function publishedDelay(flight, aircraftFlights = []) {
  return Math.max(delayMinutes(flight.departure), accumulatedDelay(aircraftFlights))
}

/** Minutos de escala en tu aeropuerto entre la llegada anterior y tu salida. */
export function turnaround(yourFlight, aircraftFlights = []) {
  const inbound = [...aircraftFlights]
    .filter((f) => f.number !== yourFlight.number)
    .filter((f) => iata(f.arrival) === iata(yourFlight.departure))
    .pop()
  const llegada = hhmm(inbound?.arrival?.revisedTime ?? inbound?.arrival?.scheduledTime)
  const salida = hhmm(yourFlight.departure?.revisedTime ?? yourFlight.departure?.scheduledTime)
  if (!llegada || !salida) return null
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = toMin(salida) - toMin(llegada)
  if (diff < 0) diff += 1440
  return diff
}

/**
 * Punto de entrada del adaptador.
 * @param {object} flight   FlightContract del vuelo buscado
 * @param {object[]} aircraftFlights  vuelos de la misma matrícula hoy
 * @param {object[]} aircraftInfo  ficha del avión (opcional, para la edad)
 */
export function toInternal(flight, aircraftFlights = [], aircraftInfo = null, rangeFlights = []) {
  // Tres niveles de conocimiento sobre el avión, y conviene no confundirlos:
  //   · matrícula o Mode-S → sabemos QUÉ avión concreto es, y podemos seguir
  //     su rotación. Verificado: a 8 h de la salida todavía no vienen.
  //   · solo el modelo → sabemos en qué TIPO de avión vas a volar, que es poco
  //     pero no es nada, y se puede contar.
  //   · nada → ni eso.
  const reg = flight.aircraft?.reg ?? null
  const modeS = flight.aircraft?.modeS ?? null
  const model = flight.aircraft?.model ?? aircraftInfo?.model ?? null
  // Solo con matrícula o Mode-S se puede reconstruir la rotación.
  const traceable = Boolean(reg || modeS)

  const status = normalizeStatus(flight.status)

  return {
    code: flight.number,
    status,
    airline: flight.airline?.name ?? null,
    route: {
      from: { city: city(flight.departure), iata: iata(flight.departure) },
      to: { city: city(flight.arrival), iata: iata(flight.arrival) },
    },
    departure: {
      scheduled: hhmm(flight.departure?.scheduledTime),
      revised: hhmm(flight.departure?.revisedTime),
      terminal: flight.departure?.terminal ?? null,
      gate: flight.departure?.gate ?? null,
    },
    // La llegada es donde vive el valor del producto: la aerolínea publica su
    // hora revisada y el proveedor su propia predicción, y no coinciden.
    // Medido en un vuelo real: aerolínea 18:35, predicción 18:59.
    arrival: {
      scheduled: hhmm(flight.arrival?.scheduledTime),
      revised: hhmm(flight.arrival?.revisedTime),
      predicted: hhmm(flight.arrival?.predictedTime),
      terminal: flight.arrival?.terminal ?? null,
    },
    aircraft: reg || modeS || model
      ? { reg, modeS, model: model ?? 'Avión sin identificar', ageYears: aircraftInfo?.ageYears ?? null }
      : null,
    delayMin: publishedDelay(flight, aircraftFlights),
    turnaroundMin: turnaround(flight, aircraftFlights),
    // La distancia la da el propio API, así que el panel de compensación del
    // 261/2004 deja de depender de un dato inventado en los fixtures.
    distanceKm: flight.greatCircleDistance?.km ?? null,
    lastUpdatedUtc: flight.lastUpdatedUtc ?? null,
    quality: flight.departure?.quality ?? [],
    // AeroDataBox publica su propia predicción de llegada, y la da incluso
    // cuando todavía no hay avión asignado. Es la mejor señal disponible en el
    // momento en el que menos sabemos.
    predictedArrival: hhmm(flight.arrival?.predictedTime),
    predictedDelayMin: predictedDelay(flight.arrival),
    // Nuestra estimación, que es lo que diferencia la tarjeta de leer la
    // pantalla del aeropuerto. Sin esto, los paneles de "va tarde" y "ya ha
    // salido" se quedaban en blanco con datos reales.
    estimate: buildEstimate(flight, status),
    rotation: traceable ? buildRotation(flight, aircraftFlights) : [],
    history: buildHistory(rangeFlights),
  }
}
