// Cloudflare Pages Functions: la ruta la da la ubicación del archivo (/api/flight).
import { handleFlightRequest } from '../../src/lib/flightService.js'

/**
 * Red de seguridad. Si algo se cae aquí dentro sin que nadie lo recoja,
 * Cloudflare responde con su propia página («error code: 502»), que no es
 * JSON: el navegador no la puede leer y la web se quedaba sin saber qué había
 * pasado. Esto garantiza que SIEMPRE salga JSON, y que el motivo real viaje
 * en una cabecera para poder diagnosticarlo desde fuera.
 *
 * Pasó el 28/11/2026 y costó una tarde de búsqueda a ciegas.
 */
export const onRequestGet = async (contexto) => {
  const { request, env } = contexto
  try {
    return await handleFlightRequest(
      request,
      env,
      request.headers.get('CF-Connecting-IP') ?? 'anon',
      // Envuelto en una función propia y no pasado pelado: `waitUntil` es un
      // método del contexto y separarlo de él puede dejarlo sin su `this`.
      // Permite registrar la predicción después de responder, sin que quien
      // busca su vuelo tenga que esperar a que se escriba en la base de datos.
      typeof contexto.waitUntil === 'function' ? (tarea) => contexto.waitUntil(tarea) : null,
    )
  } catch (err) {
    console.error('[isitlate] la función se ha caído:', err)
    return new Response(JSON.stringify({ error: 'provider_error' }), {
      status: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        // Para diagnosticar sin enseñar tripas al usuario.
        'x-isitlate-crash': String(err?.message ?? err).replace(/[^\x20-\x7e]/g, ' ').slice(0, 120),
        'x-isitlate-key': env?.AERODATABOX_KEY ? 'si' : 'NO',
        'x-isitlate-db': env?.DB?.prepare ? 'si' : 'NO',
      },
    })
  }
}
