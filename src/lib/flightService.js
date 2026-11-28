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
import { normalizeStatus, toInternal } from './adapter.js'
// Estáticos a propósito. Con `await import()` el empaquetador de
// Cloudflare Functions deja estos módulos en un archivo aparte que no se
// sube, y la primera búsqueda real tumbaba la función con un 502 del que
// no quedaba ni rastro en las cabeceras. 28/11/2026.
import { FIXTURES, DEMO_CODE } from '../data/fixtures.es.js'
import { fixtureForCode } from '../data/flightApi.js'
import { necesitaHistorial } from './verdict.js'
import {
  completarReales,
  guardarPrediccion,
  hayBaseDeDatos,
  devolverGasto,
  marcarAvisado,
  sumarGasto,
} from './registro.js'

/** Formato de número de vuelo: 2-3 caracteres de aerolínea + 1-4 dígitos. */
const FLIGHT_CODE = /^[A-Z0-9]{2,3}\d{1,4}$/

/**
 * Caché adaptativa.
 *
 * Medido con un vuelo real: consultado a las 15:44 UTC, su `lastUpdatedUtc`
 * marcaba las 10:24 UTC. Cinco horas sin que el proveedor tocara la ficha,
 * porque nada del vuelo había cambiado. Cachear 90 s un vuelo que sale dentro
 * de horas es, por tanto, tirar unidades del plan gratuito a la basura.
 *
 * Cerca de la salida sí conviene refrescar: es cuando aparecen avión, puerta y
 * retrasos.
 */
const CACHE_TTL_LEJOS_MS = 15 * 60_000 // a más de 3 h de la salida
const CACHE_TTL_CERCA_MS = 90_000 // en la recta final
/** El historial del número de vuelo cambia una vez al día: cachearlo 12 h. */
const CACHE_TTL_HISTORIAL_MS = 12 * 3600_000
/** Días de histórico que alimentan la tira de puntualidad. */
const DIAS_HISTORIAL = 7
// 6 por IP y minuto. Estaba en 20, que era un agujero: una búsqueda gasta
// entre 4 y 10 unidades del proveedor, así que 20 por minuto desde una sola
// IP podían vaciar el tope del día en tres minutos. Para una persona de
// verdad, 6 sobran: se busca un vuelo, se recarga un par de veces y ya.
// El tope diario sigue siendo la red de seguridad de debajo.
const RATE_LIMIT = { max: 6, windowMs: 60_000 }

/**
 * Ritmo al que el proveedor nos deja llamar.
 *
 * El plan Basic de AeroDataBox admite UNA petición por segundo, y una
 * búsqueda nuestra encadena hasta tres (vuelo, rotación e historial). Al
 * dispararlas seguidas, el proveedor devolvía 429 a la segunda y la búsqueda
 * fallaba entera, de forma aparentemente aleatoria: unas veces iba y otras
 * no, según cuántas llamadas necesitara ese vuelo.
 *
 * Se espera un poco más del segundo exacto para dar margen al reloj.
 */
const MIN_ENTRE_LLAMADAS_MS = 1150
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function cacheSet(key, value, ttl) {
  cache.set(key, { value, expires: Date.now() + ttl })
  if (cache.size > 500) cache.delete(cache.keys().next().value)
}

/** Cuánto cachear según lo lejos que esté la salida. */
function ttlFor(flight) {
  const salida = flight.departure?.scheduledTime?.utc
  if (!salida) return CACHE_TTL_CERCA_MS
  const faltan = new Date(salida.replace(' ', 'T')) - Date.now()
  return faltan > 3 * 3600_000 ? CACHE_TTL_LEJOS_MS : CACHE_TTL_CERCA_MS
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
 * Qué día le pedimos al proveedor.
 *
 * `today()` se calcula en hora de Greenwich, y España va una o dos horas por
 * delante. Entre las 00:00 y la 01:00 de la madrugada (las 02:00 en verano)
 * le estaríamos preguntando por el día anterior: justo la franja en la que
 * alguien espera en llegadas un vuelo de madrugada.
 *
 * La solución es que el navegador diga su propia fecha local, que es la que
 * tiene en la cabeza quien busca. Se valida y se acota a ±2 días: sin ese
 * tope, cualquiera podría ir pidiendo fechas una tras otra y vaciarnos la
 * cuota del mes en un rato.
 */
export function fechaPedida(cruda, hoyUtc = today()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cruda ?? '')) return hoyUtc
  const dias = Math.abs(Date.parse(`${cruda}T12:00:00Z`) - Date.parse(`${hoyUtc}T12:00:00Z`)) / 86400_000
  return Number.isFinite(dias) && dias <= 2 ? cruda : hoyUtc
}

/** Fecha de hace n días, en el mismo formato. */
const daysAgo = (n) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10)

/**
 * De entre los vuelos que devuelve el proveedor, el que sale en la fecha
 * pedida.
 *
 * El endpoint se llama "Flight status (nearest day)" y su documentación dice
 * que devuelve el vuelo que sale **o llega** en la fecha consultada. Eso
 * significa que un Valencia-Estambul que sale a las 18:25 y aterriza a las
 * 00:10 del día siguiente aparece DOS veces al preguntar por hoy: la
 * instancia de ayer (que llegó esta madrugada) y la de hoy (que aún no ha
 * salido).
 *
 * El código cogía el primero de la lista a ciegas, y el primero es el de
 * ayer. Resultado visto en producción el 23/11: el TK1314 de hoy, que salía
 * a las 18:25, se enseñaba como "ya ha salido y ha aterrizado", con los
 * datos del día anterior.
 *
 * Afecta a todos los vuelos que aterrizan pasada la medianoche, que son los
 * de larga distancia y los de última hora: justo los que más importan.
 */
export function elQueSaleHoy(flights, fecha) {
  if (!flights?.length) return null
  const deHoy = flights.filter((f) =>
    String(f.departure?.scheduledTime?.local ?? f.departure?.scheduledTime?.utc ?? '').startsWith(fecha),
  )
  // Si ninguno declara fecha de salida reconocible, mejor el primero que nada.
  return deHoy[0] ?? flights[0]
}

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
/* ═══════════════════════════════════════════════════════════════════════
   PRESUPUESTO DIARIO
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Lo que cuesta cada consulta, en unidades del proveedor.
 *
 * Según su tabla de precios: Tier 1 = 1, Tier 2 = 2, Tier 3 = 6. El endpoint
 * del vuelo está marcado como Tier 2 en su consola. El del historial no está
 * confirmado y se asume el peor caso, que es lo prudente cuando el riesgo es
 * quedarse sin servicio a mitad de mes.
 */
const UNIDADES = { vuelo: 2, rotacion: 2, historial: 6 }

/**
 * Tope de gasto por día.
 *
 * El plan gratuito da 600 unidades al MES. Sin un tope diario, una tarde en
 * la que el enlace circule por un grupo de WhatsApp lo funde entero y la web
 * se queda sin datos hasta el mes siguiente. Con 60 al día, un día malo
 * cuesta un 10% del mes y queda margen para reaccionar.
 *
 * Se puede subir con la variable PRESUPUESTO_DIARIO al pasar a un plan mayor.
 *
 * LIMITACIÓN CONOCIDA, y es importante: este contador vive en la memoria de
 * cada instancia del servidor, y Cloudflare levanta varias. Por tanto el tope
 * real es más alto que el configurado: frena una avalancha, no la corta con
 * precisión. El arreglo de verdad es llevar la cuenta en Cloudflare D1, que
 * además hace falta para registrar predicciones. Mientras tanto, esto es
 * mucho mejor que nada.
 */
const PRESUPUESTO_POR_DEFECTO = 60
/** A partir de aquí conviene avisar al dueño, antes de quedarse sin nada. */
const AVISAR_AL = 0.7

const gasto = { dia: null, unidades: 0, avisado: false }

/** Error propio: hemos decidido no gastar más hoy. */
class BudgetError extends Error {
  constructor(gastadas, tope) {
    super(`Presupuesto diario agotado (${gastadas}/${tope} unidades)`)
    this.status = 'presupuesto'
  }
}

function topeDiario(env) {
  const puesto = Number(env?.PRESUPUESTO_DIARIO)
  return Number.isFinite(puesto) && puesto > 0 ? puesto : PRESUPUESTO_POR_DEFECTO
}

/**
 * Reserva unidades antes de llamar. Lanza si ya no quedan.
 *
 * Con base de datos, la cuenta es global y de verdad: la suma es atómica, así
 * que varias instancias atendiendo a la vez no se pisan. Sin ella, se cae al
 * contador en memoria de cada instancia, que frena pero no corta.
 */
async function reservar(coste, env) {
  const tope = topeDiario(env)

  const enBase = await sumarGasto(env, coste)
  if (enBase) {
    // La cabecera de diagnóstico sigue enseñando el total real.
    gasto.unidades = enBase.unidades
    gasto.dia = today()
    // Al pasarse hay que devolver lo apuntado: la llamada no se va a hacer.
    // Si no, cada intento bloqueado sigue sumando y el contador deja de medir
    // gasto real. Hoy marcaba 204 unidades con un tope de 60, y la mayoría
    // eran intentos que nunca llegaron al proveedor: imposible saber cuánto
    // se había gastado de verdad.
    if (enBase.unidades > tope) {
      await devolverGasto(env, coste)
      throw new BudgetError(enBase.unidades, tope)
    }
    if (!enBase.avisado && enBase.unidades >= tope * AVISAR_AL) {
      await marcarAvisado(env)
      await avisarAlDueno(enBase.unidades, tope, env)
    }
    return
  }

  const hoy = today()
  if (gasto.dia !== hoy) {
    gasto.dia = hoy
    gasto.unidades = 0
    gasto.avisado = false
  }
  if (gasto.unidades + coste > tope) throw new BudgetError(gasto.unidades, tope)
  gasto.unidades += coste

  if (!gasto.avisado && gasto.unidades >= tope * AVISAR_AL) {
    gasto.avisado = true
    await avisarAlDueno(gasto.unidades, tope, env)
  }
}

/**
 * Aviso al dueño cuando el gasto se acerca al tope.
 *
 * Al usuario NUNCA se le habla de esto: que no podamos consultar un vuelo es
 * problema nuestro. Pero conviene enterarse antes de que pase, no después.
 *
 * Por Telegram porque es gratis y porque es la misma tubería que hará falta
 * para los avisos del producto ("ha despegado", "ha aterrizado"). Sin las
 * variables configuradas, no hace nada y no estorba.
 */
async function avisarAlDueno(gastadas, tope, env) {
  const token = env?.TELEGRAM_BOT_TOKEN
  const chat = env?.TELEGRAM_CHAT_ID
  const texto = `🔔 IsItLate: ${gastadas} de ${tope} unidades gastadas hoy (${Math.round((gastadas / tope) * 100)}%).`
  console.warn('[isitlate]', texto)
  if (!token || !chat) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: texto }),
    })
  } catch (err) {
    // Que falle el aviso no puede tumbar una búsqueda.
    console.warn('[isitlate] no se pudo avisar:', err.message)
  }
}

/**
 * Error del proveedor que recuerda QUÉ respondió.
 *
 * Sin el código, "no hemos podido consultar el vuelo" tapa por igual una
 * cuota agotada, un permiso que falta y una petición mal formada, y desde
 * fuera no hay manera de distinguirlas.
 */
class ProviderError extends Error {
  constructor(status, path) {
    super(`Proveedor respondió ${status} en ${path}`)
    this.status = status
    this.path = path
  }
}

async function callProvider(path, env, reintentar = true, coste = UNIDADES.vuelo) {
  // Solo en el primer intento: un reintento tras un 429 no consume de nuevo.
  if (reintentar) await reservar(coste, env)
  const host = env.AERODATABOX_HOST || 'aerodatabox.p.rapidapi.com'
  const res = await fetch(`https://${host}${path}`, {
    headers: {
      'X-RapidAPI-Key': env.AERODATABOX_KEY,
      'X-RapidAPI-Host': host,
      Accept: 'application/json',
    },
  })
  if (res.status === 404) return []
  // Un 429 puede venir de otra persona buscando a la vez, no solo de
  // nosotros: espaciar nuestras llamadas no basta cuando hay concurrencia.
  // Un único reintento resuelve la colisión sin convertirse en un bucle.
  if (res.status === 429 && reintentar) {
    await pausa(MIN_ENTRE_LLAMADAS_MS)
    return callProvider(path, env, false, coste)
  }
  if (!res.ok) throw new ProviderError(res.status, path)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.flights ?? [data])
}

/**
 * @param {Request} request
 * @param {object} env  variables de entorno (process.env o el env de Cloudflare)
 * @param {string} ip   IP del cliente, para el rate limit
 */
export async function handleFlightRequest(request, env, ip = 'anon', waitUntil = null) {
  const url = new URL(request.url)
  const code = (url.searchParams.get('code') || '').trim().toUpperCase()
  const fecha = fechaPedida(url.searchParams.get('date'))

  if (!FLIGHT_CODE.test(code)) {
    // El texto lo pone el navegador a partir del código: así sale en el
    // idioma de quien busca. Antes el servidor mandaba la frase en español
    // fija y un usuario inglés se encontraba un mensaje que no entendía.
    return json({ error: 'invalid_code' }, 400)
  }

  if (rateLimited(ip)) {
    return json({ error: 'rate_limited' }, 429, { 'retry-after': '60' })
  }

  // Sin key configurada seguimos en modo demo: la web despliega y funciona.
  if (!env.AERODATABOX_KEY) {
    return json({ ...fixtureForCode(code, FIXTURES, DEMO_CODE), demo: true }, 200, { 'x-isitlate-mode': 'demo' })
  }

  const cacheKey = `${code}:${fecha}`
  const cached = cacheGet(cacheKey)
  if (cached) return json(cached, 200, { 'x-isitlate-cache': 'hit' })

  try {
    // 1) El vuelo del usuario → nos da la matrícula asignada.
    const candidatos = await callProvider(`/flights/number/${code}/${fecha}?${OPCIONES}`, env)
    const flight = elQueSaleHoy(candidatos, fecha)
    if (!flight) {
      return json({ error: 'not_found', code }, 404)
    }

    // 2) Los tramos de ese avión hoy → la rotación.
    //
    // Se busca por matrícula cuando la hay y, si no, por Mode-S: en respuestas
    // reales `reg` puede faltar mientras `modeS` sí viene, y ambos identifican
    // al mismo avión (enum FlightSearchByEnum: number, reg, callSign, icao24).
    const { reg, modeS } = flight.aircraft ?? {}
    const buscarPor = reg ? `reg/${encodeURIComponent(reg)}` : modeS ? `icao24/${encodeURIComponent(modeS)}` : null
    let aircraftFlights = []
    if (buscarPor) {
      await pausa(MIN_ENTRE_LLAMADAS_MS)
      aircraftFlights = await callProvider(
        `/flights/${buscarPor}/${fecha}?${OPCIONES}`, env, true, UNIDADES.rotacion,
      )
    }

    // 3) El historial del número de vuelo: cómo se porta habitualmente.
    //
    // Es lo único que podemos contar cuando no hay avión identificado, que
    // según las mediciones es casi siempre antes de despegar. Se cachea 12 h
    // porque solo cambia al cerrarse el día, y va aparte del vuelo del día
    // para no repetir una consulta de rango, que es de las caras en unidades.
    // Solo se pide si el estado del vuelo va a enseñarlo. Antes se pedía
    // siempre: para un vuelo embarcando, volando o cancelado gastábamos la
    // consulta más cara del proveedor y tirábamos la respuesta.
    const historyKey = `hist:${code}`
    let rangeFlights = cacheGet(historyKey) ?? []
    const haceFalta = necesitaHistorial(normalizeStatus(flight.status), Boolean(reg || modeS))
    if (haceFalta && !cacheGet(historyKey)) {
      await pausa(MIN_ENTRE_LLAMADAS_MS)
      rangeFlights = await callProvider(
        `/flights/number/${code}/${daysAgo(DIAS_HISTORIAL)}/${daysAgo(1)}?${OPCIONES}`,
        env, true, UNIDADES.historial,
      ).catch((err) => {
        // Un fallo aquí no debe tumbar la búsqueda: el historial es apoyo.
        console.warn('[isitlate] historial no disponible:', err.message)
        return []
      })
      cacheSet(historyKey, rangeFlights, CACHE_TTL_HISTORIAL_MS)
    }

    const result = toInternal(flight, aircraftFlights, null, rangeFlights)
    cacheSet(cacheKey, result, ttlFor(flight))

    // Apuntar la predicción y, si el vuelo ya aterrizó, cerrar la de aquel
    // día con la hora real. Ninguna de las dos cosas gasta proveedor, y van
    // en segundo plano para no hacer esperar a quien busca su vuelo.
    if (hayBaseDeDatos(env)) {
      const registrar = Promise.all([
        guardarPrediccion(env, result, fecha),
        completarReales(env, result, fecha),
      ])
      if (waitUntil) waitUntil(registrar)
      else await registrar
    }
    return json(result, 200, {
      'x-isitlate-cache': 'miss',
      'x-isitlate-gasto': `${gasto.unidades}/${topeDiario(env)}`,
    })
  } catch (err) {
    console.error('[isitlate] fallo consultando el proveedor:', err)
    // El mensaje al usuario no cambia; el código del proveedor viaja en una
    // cabecera para poder diagnosticar desde fuera sin enseñar tripas.
    // Al usuario le da igual si es una cuota agotada, un permiso o una
    // caída del proveedor: todo eso es problema nuestro. Ve un mensaje
    // neutro. El motivo real viaja en una cabecera, para diagnosticar.
    // 503 y no 502 a propósito, y no es un detalle: Cloudflare TIRA el cuerpo
    // de cualquier respuesta 502 que devuelva la función y la sustituye por su
    // propia página («error code: 502», texto plano, sin cabeceras). El
    // navegador no podía leerla, se iba por el camino del fallo y acabó
    // ensenando un vuelo de ejemplo como si fuera el buscado. Con 503 la
    // respuesta llega intacta. Comprobado en producción el 28/11/2026.
    return json({ error: 'provider_error' }, 503, {
      'x-isitlate-provider-status': String(err?.status ?? 'desconocido'),
    })
  }
}
