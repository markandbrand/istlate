/**
 * Único punto de contacto de la interfaz con los datos.
 *
 * Hoy pega contra /api/flight, que en ausencia de key devuelve los datos de
 * ejemplo. El día que la key esté puesta, esta función no cambia ni una línea:
 * la respuesta ya viene en la forma interna.
 */
import { fixtureForCode, FIXTURES } from './fixtures.js'

/** Si no hay backend (npm run dev a secas), tiramos de los datos de ejemplo. */
const OFFLINE_FALLBACK = true

export class FlightError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export async function lookupFlight(code) {
  const normalized = (code || '').trim().toUpperCase()

  try {
    const res = await fetch(`/api/flight?code=${encodeURIComponent(normalized)}`)
    const body = await res.json()
    if (!res.ok) throw new FlightError(body.message ?? 'No hemos podido consultar el vuelo.', body.error)
    return body
  } catch (err) {
    if (err instanceof FlightError) throw err
    // No hay función serverless levantada: seguimos en modo demo.
    if (OFFLINE_FALLBACK) return { ...fixtureForCode(normalized), demo: true }
    throw new FlightError('No hemos podido consultar el vuelo ahora mismo.', 'network')
  }
}

/** Carga directa de un escenario, para el selector de la demo. */
export function loadScenario(key) {
  return { ...FIXTURES[key], demo: true }
}
