/**
 * Lógica de servidor, sin depender de Netlify ni de Cloudflare.
 * Los handlers de cada host (netlify/functions/ y functions/api/) son
 * envoltorios de tres líneas sobre `handleFlightRequest`.
 *
 * Responsabilidades, en orden de importancia:
 *   1. Guardar la API key fuera del navegador.
 *   2. No pagar dos veces por la misma pregunta (caché).
 *   3. Que nadie te funda la cuota mensual (rate limit + validación).
 */
import { toInternal } from './adapter.js'

/** Formato de número de vuelo: 2-3 caracteres de aerolínea + 1-4 dígitos. */
const FLIGHT_CODE = /^[A-Z0-9]{2,3}\d{1,4}$/

const CACHE_TTL_MS = 90_000 // vuelos en vivo: 90 s
const RATE_LIMIT = { max: 20, windowMs: 60_000 } // 20 búsquedas por IP y minuto

/**
 * Caché y contadores en memoria del proceso.
 *
 * LIMITACIÓN CONOCIDA: en serverless esto vive por instancia y se pierde en
 * los arranques en frío, así que protege de ráfagas pero no es un límite
 * global. Cuando el tráfico lo justifique, cámbialo por Netlify Blobs o
 * Cloudflare KV — la interfaz de `cache` es a propósito la mínima para que
 * sustituirla sea trivial.
 */
const cache = new Map()
const hits = new Map()

function cacheGet(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.value
}

function cacheSet(key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
  if (cache.size > 500) cache.delete(cache.keys().next().value)
}

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_LIMIT.max
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })

/** Fecha de hoy en formato YYYY-MM-DD, que es lo que espera AeroDataBox. */
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Parámetros opcionales, copiados de la consola de RapidAPI.
 *
 * Las imágenes de avión y el plan de vuelo engordan la respuesta y no los
 * usamos todavía. `withLocation` daría la posición en vivo del avión, que sí
 * nos interesará el día que queramos pintar "tu avión está sobre los
 * Pirineos": activarlo entonces y comprobar si cambia el coste en unidades.
 */
const OPCIONES = new URLSearchParams({
  withAircraftImage: 'false',
  withLocation: 'false',
  withFlightPlan: 'false',
  dateLocalRole: 'Both',
})

/**
 * Llama a AeroDataBox.
 *
 * Ruta verificada en la consola de RapidAPI:
 *   GET /flights/number/{numeroDeVuelo}/{fecha}
 * donde el segmento tras /flights/ admite number, reg, callSign o icao24
 * (enum FlightSearchByEnum de su esquema).
 */
async function callProvider(path, env) {
  const host = env.AERODATABOX_HOST || 'aerodatabox.p.rapidapi.com'
  const res = await fetch(`https://${host}${path}`, {
    headers: {
      'X-RapidAPI-Key': env.AERODATABOX_KEY,
      'X-RapidAPI-Host': host,
      Accept: 'application/json',
    },
  })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`Proveedor respondió ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.flights ?? [data])
}

/**
 * @param {Request} request
 * @param {object} env  variables de entorno (process.env o el env de Cloudflare)
 * @param {string} ip   IP del cliente, para el rate limit
 */
export async function handleFlightRequest(request, env, ip = 'anon') {
  const code = (new URL(request.url).searchParams.get('code') || '').trim().toUpperCase()

  if (!FLIGHT_CODE.test(code)) {
    return json(
      { error: 'invalid_code', message: 'Eso no parece un número de vuelo. Prueba con algo como FR1234.' },
      400,
    )
  }

  if (rateLimited(ip)) {
    return json(
      { error: 'rate_limited', message: 'Vas muy rápido. Espera un minuto y vuelve a intentarlo.' },
      429,
      { 'retry-after': '60' },
    )
  }

  // Sin key configurada seguimos en modo demo: la web despliega y funciona.
  if (!env.AERODATABOX_KEY) {
    const { FIXTURES, DEMO_CODE } = await import('../data/fixtures.es.js')
    const { fixtureForCode } = await import('../data/flightApi.js')
    return json({ ...fixtureForCode(code, FIXTURES, DEMO_CODE), demo: true }, 200, { 'x-isitlate-mode': 'demo' })
  }

  const cacheKey = `${code}:${today()}`
  const cached = cacheGet(cacheKey)
  if (cached) return json(cached, 200, { 'x-isitlate-cache': 'hit' })

  try {
    // 1) El vuelo del usuario → nos da la matrícula asignada.
    const [flight] = await callProvider(`/flights/number/${code}/${today()}?${OPCIONES}`, env)
    if (!flight) {
      return json(
        { error: 'not_found', message: `No encontramos el vuelo ${code} para hoy.` },
        404,
      )
    }

    // 2) Los tramos de ese avión hoy → la rotación.
    //
    // Se busca por matrícula cuando la hay y, si no, por Mode-S: en respuestas
    // reales `reg` puede faltar mientras `modeS` sí viene, y ambos identifican
    // al mismo avión (enum FlightSearchByEnum: number, reg, callSign, icao24).
    const { reg, modeS } = flight.aircraft ?? {}
    const buscarPor = reg ? `reg/${encodeURIComponent(reg)}` : modeS ? `icao24/${encodeURIComponent(modeS)}` : null
    const aircraftFlights = buscarPor
      ? await callProvider(`/flights/${buscarPor}/${today()}?${OPCIONES}`, env)
      : []

    const result = toInternal(flight, aircraftFlights)
    cacheSet(cacheKey, result)
    return json(result, 200, { 'x-isitlate-cache': 'miss' })
  } catch (err) {
    console.error('[isitlate] fallo consultando el proveedor:', err)
    return json(
      { error: 'provider_error', message: 'No hemos podido consultar el vuelo ahora mismo. Inténtalo en un minuto.' },
      502,
    )
  }
}
