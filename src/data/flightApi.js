/**
 * Único punto de contacto de la interfaz con los datos.
 *
 * Hoy pega contra /api/flight, que en ausencia de key devuelve los datos de
 * ejemplo. El día que la key esté puesta, esta función no cambia: la respuesta
 * ya viene en la forma interna.
 */

/**
 * Datos de ejemplo cuando no hay backend: SOLO en desarrollo.
 *
 * En producción esto estaba en `true`, y el efecto era grave: si la función
 * del servidor fallaba, el navegador no podía leer la respuesta, caía aquí y
 * le ensenaba a la gente un vuelo de ejemplo —Valencia-Londres, con sus
 * horas— como si fuera el vuelo que acababa de buscar. Mentir sobre a qué
 * hora sale un avión es justo lo contrario de lo que hace esta web.
 *
 * Ahora, si el servidor falla, se ve un mensaje de error. Es menos bonito y
 * es lo correcto. En `npm run dev` sigue funcionando sin backend.
 */
const OFFLINE_FALLBACK = Boolean(import.meta.env?.DEV)

/**
 * Un fallo de búsqueda, identificado por su CLAVE, no por su texto.
 *
 * El texto lo pone la capa de idioma: así el mismo fallo se cuenta en español
 * o en inglés según quien mire, y el servidor no tiene que saber idiomas.
 */
export class FlightError extends Error {
  constructor(clave, vuelo = null) {
    super(clave)
    this.clave = clave
    this.vuelo = vuelo
  }
}

/** Busca un escenario por su número de vuelo; si no, el de la demo. */
export function fixtureForCode(code, fixtures, demoCode) {
  const normalized = (code || '').trim().toUpperCase()
  const match = Object.values(fixtures).find((f) => f.code === normalized)
  return match ?? { ...fixtures.late, code: normalized || demoCode }
}

/**
 * La fecha de HOY según el reloj del navegador, no según Greenwich.
 *
 * El servidor no puede saberlo: entre medianoche y la una de la madrugada en
 * España, la fecha en hora de Greenwich es todavía la de ayer, y acabaríamos
 * preguntando por el vuelo del día anterior.
 */
function hoyLocal() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export async function lookupFlight(code, { fixtures, demoCode }) {
  const normalized = (code || '').trim().toUpperCase()

  try {
    const res = await fetch(
      `/api/flight?code=${encodeURIComponent(normalized)}&date=${hoyLocal()}`,
    )
    const body = await res.json()
    if (!res.ok) throw new FlightError(body.error ?? 'provider_error', body.code ?? normalized)
    return body
  } catch (err) {
    if (err instanceof FlightError) throw err
    // En desarrollo, sin función serverless levantada, seguimos en modo demo.
    if (OFFLINE_FALLBACK) return { ...fixtureForCode(normalized, fixtures, demoCode), demo: true }
    // En producción, un fallo es un fallo. Nunca un vuelo inventado.
    throw new FlightError('network', normalized)
  }
}
