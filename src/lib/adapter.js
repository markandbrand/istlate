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

    let tag
    if (llegado) tag = `🛬 Aterrizó · ${hhmm(f.arrival?.revisedTime ?? f.arrival?.scheduledTime)}`
    else if (salido) tag = '✈️ En vuelo ahora mismo'
    else tag = 'Pendiente'
    if (delay > 0 && !salido && !llegado) tag += ` (+${delay} min)`

    return { airport: city(f.arrival), iata: iata(f.arrival), state, tag }
  })

  legs.push({
    airport: city(yourFlight.arrival),
    iata: iata(yourFlight.arrival),
    state: 'final',
    tag: '🎯 Tu vuelo',
  })

  return legs
}

/** Retraso acumulado del avión hoy: el del último tramo con datos. */
export function accumulatedDelay(aircraftFlights = []) {
  return aircraftFlights.reduce((max, f) => Math.max(max, delayMinutes(f.departure)), 0)
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
export function toInternal(flight, aircraftFlights = [], aircraftInfo = null) {
  // La matrícula no siempre viene; el Mode-S (dirección ICAO de 24 bits) sí, y
  // sirve igual para encadenar la consulta de la rotación. Que falte `reg` no
  // significa que no sepamos qué avión es.
  const reg = flight.aircraft?.reg ?? null
  const modeS = flight.aircraft?.modeS ?? null
  const identificado = Boolean(reg || modeS)

  return {
    code: flight.number,
    status: normalizeStatus(flight.status),
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
    aircraft: identificado
      ? {
          reg,
          modeS,
          model: flight.aircraft?.model ?? aircraftInfo?.model ?? 'Avión sin identificar',
          ageYears: aircraftInfo?.ageYears ?? null,
        }
      : null,
    delayMin: accumulatedDelay(aircraftFlights),
    turnaroundMin: turnaround(flight, aircraftFlights),
    // La distancia la da el propio API, así que el panel de compensación del
    // 261/2004 deja de depender de un dato inventado en los fixtures.
    distanceKm: flight.greatCircleDistance?.km ?? null,
    lastUpdatedUtc: flight.lastUpdatedUtc ?? null,
    quality: flight.departure?.quality ?? [],
    estimate: null, // se calcula en el backend cuando haya datos suficientes
    rotation: identificado ? buildRotation(flight, aircraftFlights) : [],
  }
}
