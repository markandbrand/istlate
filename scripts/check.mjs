/**
 * Comprobaciones que se ejecutan en cada cambio, antes de publicar.
 *
 * No son pruebas de laboratorio: cada una nació de un fallo real que llegó a
 * estar en el código y que solo se vio al mirar la pantalla. Están aquí para
 * que no vuelvan.
 *
 *   npm run check
 */
import { toInternal, buildEstimate } from '../src/lib/adapter.js'
import { deriveVerdict, necesitaHistorial } from '../src/lib/verdict.js'
import { planDeRecogida, sePuedeRecoger } from '../src/lib/pickup.js'
import { planDeSalida, sePuedeVolar } from '../src/lib/salida.js'
import { antelacionEn } from '../src/data/airports.js'
import { elQueSaleHoy, fechaPedida, handleFlightRequest } from '../src/lib/flightService.js'
import { guardarPrediccion, completarReales, sumarGasto } from '../src/lib/registro.js'
import { codigoDeLaRuta, idiomaDeLaRuta, rutaDeVuelo } from '../src/lib/rutas.js'
import { esperaEnTerminal } from '../src/data/airports.js'
import es from '../src/i18n/es.js'
import en from '../src/i18n/en.js'
import { FIXTURES as FIXTURES_ES } from '../src/data/fixtures.es.js'
import { FIXTURES as FIXTURES_EN } from '../src/data/fixtures.en.js'

let fallos = 0
let pruebas = 0

function comprobar(nombre, condicion, detalle = '') {
  pruebas++
  if (condicion) {
    console.log(`  ✅ ${nombre}`)
  } else {
    fallos++
    console.log(`  ❌ ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  }
}

function bloque(titulo) {
  console.log(`\n${titulo}`)
}

/** Una hora de AeroDataBox, que viene como objeto { local, utc }. */
const hora = (hhmm) => ({ local: `2026-11-17 ${hhmm}+01:00`, utc: `2026-11-17 ${hhmm}Z` })

// ---------------------------------------------------------------------------
bloque('Nuestra estimación (estuvo a null con un TODO y dejaba paneles vacíos)')

const sinRevisar = buildEstimate(
  { departure: { scheduledTime: hora('17:40') }, arrival: { scheduledTime: hora('18:50'), predictedTime: hora('18:59') } },
  'expected',
)
comprobar('un vuelo en tierra devuelve franja de salida', sinRevisar?.from === '17:35' && sinRevisar?.to === '17:55',
  JSON.stringify(sinRevisar))

const volando = buildEstimate(
  { departure: { scheduledTime: hora('21:00') }, arrival: { scheduledTime: hora('22:30'), predictedTime: hora('22:35') } },
  'enRoute',
)
comprobar('un vuelo en el aire devuelve franja de llegada', volando?.from === '22:35' && volando?.to === '22:45',
  JSON.stringify(volando))

const conPrediccionPeor = buildEstimate(
  { departure: { scheduledTime: hora('10:00') }, arrival: { scheduledTime: hora('12:00'), predictedTime: hora('12:40') } },
  'expected',
)
comprobar('la predicción del proveedor estira la franja cuando la aerolínea calla',
  conPrediccionPeor?.to === '10:40', JSON.stringify(conPrediccionPeor))

const medianoche = buildEstimate(
  { departure: { scheduledTime: hora('23:50') }, arrival: { scheduledTime: hora('01:30') } },
  'expected',
)
comprobar('cruzar la medianoche no rompe la franja', medianoche?.to === '00:05', JSON.stringify(medianoche))

comprobar('sin horas no se inventa nada', buildEstimate({ departure: {}, arrival: {} }, 'expected') === null)

// ---------------------------------------------------------------------------
bloque('Retraso publicado (salía "sin retraso" con una hora de retraso real)')

const retrasado = toInternal({
  number: 'IB1082', status: 'Delayed',
  departure: { scheduledTime: hora('17:40'), revisedTime: hora('18:35'), airport: { iata: 'MAD' } },
  arrival: { scheduledTime: hora('18:50'), airport: { iata: 'LHR' } },
})
comprobar('el retraso del propio vuelo cuenta aunque no haya rotación', retrasado.delayMin === 55,
  `delayMin=${retrasado.delayMin}`)

// ---------------------------------------------------------------------------
bloque('Todos los estados pintan su panel con datos reales (fallaban 3 de 6)')

const historial = ['10', '11', '12', '13', '14', '15', '16'].map((d, i) => ({
  departure: {
    scheduledTime: { local: `2026-11-${d} 17:40+01:00` },
    revisedTime: { local: `2026-11-${d} ${['17:43', '18:01', '17:40', '18:28', '17:47', '17:52', '17:42'][i]}+01:00` },
  },
}))

const crudo = (status, extra = {}) => ({
  number: 'IB1082', status,
  airline: { name: 'Iberia' },
  aircraft: extra.aircraft ?? null,
  greatCircleDistance: { km: 1250 },
  departure: { scheduledTime: hora('17:40'), terminal: '4', airport: { municipalityName: 'Madrid', iata: 'MAD' }, ...extra.departure },
  arrival: { scheduledTime: hora('18:50'), revisedTime: hora('18:35'), predictedTime: hora('18:59'), airport: { municipalityName: 'Londres', iata: 'LHR' }, ...extra.arrival },
})

for (const [nombre, raw] of [
  ['vuelo normal sin matrícula', crudo('Expected')],
  ['embarcando', crudo('Boarding')],
  ['ya ha despegado', crudo('EnRoute')],
  ['aterrizado', crudo('Arrived')],
  ['cancelado', crudo('Canceled')],
  ['retraso grande', crudo('Delayed', { aircraft: { reg: 'EC-MXV', model: 'A320' }, departure: { revisedTime: hora('18:35') } })],
]) {
  const vuelo = toInternal(raw, [], null, historial)
  const v = deriveVerdict(vuelo, es)
  comprobar(`${nombre} → ${v.key}`, Boolean(v.panel), 'se quedaría sin panel')
}

// ---------------------------------------------------------------------------
bloque('Elegir el vuelo correcto (enseñaba el de ayer)')

// El proveedor devuelve también la instancia del día anterior cuando su
// LLEGADA cae en la fecha pedida. Caso real del 23/11 con el TK1314.
const ayerYHoy = [
  { number: 'TK1314', departure: { scheduledTime: { local: '2026-11-22 18:25+01:00' } }, status: 'EnRoute' },
  { number: 'TK1314', departure: { scheduledTime: { local: '2026-11-23 18:25+01:00' } }, status: 'Expected' },
]
comprobar('elige el que sale HOY, no el de ayer',
  elQueSaleHoy(ayerYHoy, '2026-11-23')?.status === 'Expected',
  JSON.stringify(elQueSaleHoy(ayerYHoy, '2026-11-23')?.departure))

comprobar('con el de ayer primero en la lista, sigue eligiendo bien',
  elQueSaleHoy([...ayerYHoy].reverse(), '2026-11-23')?.status === 'Expected')

comprobar('con un solo vuelo, lo devuelve',
  elQueSaleHoy([ayerYHoy[1]], '2026-11-23')?.status === 'Expected')

comprobar('sin vuelos, devuelve null', elQueSaleHoy([], '2026-11-23') === null)

comprobar('si ninguno trae fecha reconocible, no se queda sin respuesta',
  elQueSaleHoy([{ number: 'X', departure: {} }], '2026-11-23') !== null)

// ---------------------------------------------------------------------------
bloque('Qué día le pedimos al proveedor (Greenwich iba un día por detrás)')

const HOY = '2026-11-23'
comprobar('usa la fecha local del navegador', fechaPedida('2026-11-23', HOY) === '2026-11-23')
comprobar('acepta el día siguiente (madrugada en España)', fechaPedida('2026-11-24', HOY) === '2026-11-24')
comprobar('sin fecha, cae a la de Greenwich', fechaPedida(null, HOY) === HOY)
comprobar('rechaza basura', fechaPedida('ayer por la tarde', HOY) === HOY)
comprobar('rechaza un formato casi válido', fechaPedida('2026-13-99x', HOY) === HOY)
// Sin este tope, alguien podría ir pidiendo fechas una tras otra y vaciar la cuota.
comprobar('rechaza fechas lejanas (protege la cuota)', fechaPedida('2024-01-15', HOY) === HOY)
comprobar('rechaza el futuro lejano', fechaPedida('2027-06-01', HOY) === HOY)

// ---------------------------------------------------------------------------
bloque('Direcciones por vuelo (antes compartir el enlace no servía de nada)')

comprobar('lee /vuelo/TK1314', codigoDeLaRuta('/vuelo/TK1314') === 'TK1314')
comprobar('lee /flight/TK1314', codigoDeLaRuta('/flight/TK1314') === 'TK1314')
comprobar('acepta minúsculas', codigoDeLaRuta('/vuelo/tk1314') === 'TK1314')
comprobar('tolera la barra final', codigoDeLaRuta('/vuelo/TK1314/') === 'TK1314')
comprobar('rechaza una ruta sin código', codigoDeLaRuta('/vuelo/') === null)
comprobar('rechaza basura en la URL', codigoDeLaRuta('/vuelo/<script>') === null)
comprobar('no confunde la política de privacidad', codigoDeLaRuta('/privacidad') === null)
comprobar('la portada no es un vuelo', codigoDeLaRuta('/') === null)

// El proveedor devuelve "TK 1314" con espacio: sin limpiarlo, compartir
// funcionaría con los datos de ejemplo y fallaría con los reales.
comprobar('limpia el espacio del código real', rutaDeVuelo('TK 1314', 'es') === '/vuelo/TK1314')
comprobar('ruta en inglés', rutaDeVuelo('TK 1314', 'en') === '/flight/TK1314')
comprobar('conserva la query (?demo=1)',
  rutaDeVuelo('FR1234', 'es', '?demo=1') === '/vuelo/FR1234?demo=1')
comprobar('no construye rutas con basura', rutaDeVuelo('no soy un vuelo') === null)
comprobar('el idioma lo manda el enlace', idiomaDeLaRuta('/flight/TK1314') === 'en')

// ---------------------------------------------------------------------------
bloque('El historial solo se pide cuando se va a enseñar')

// Es la consulta más cara del proveedor (6 unidades de las 8 que cuesta una
// búsqueda). Esta comprobación vigila que la decisión de pedirlo y el estado
// que lo usa no se desincronicen: si mañana otro estado necesitara el
// historial y no se actualizara la condición, aquí saltaría.
const ESTADOS = [
  'Expected', 'Unknown', 'CheckIn', 'Boarding', 'GateClosed',
  'Departed', 'EnRoute', 'Approaching', 'Arrived', 'Canceled', 'Delayed',
]

let desincronizados = []
for (const estadoCrudo of ESTADOS) {
  for (const traceable of [true, false]) {
    const raw = crudo(estadoCrudo, traceable ? { aircraft: { reg: 'EC-TEST', model: 'A320' } } : {})
    const vuelo = toInternal(raw, [], null, historial)
    const clave = deriveVerdict(vuelo, es).key
    const pedido = necesitaHistorial(vuelo.status, traceable)
    // Si el veredicto es "sin avión aún", el historial TIENE que pedirse.
    if (clave === 'unassigned' && !pedido) desincronizados.push(`${estadoCrudo}/${traceable}: lo usa y no se pide`)
    // Y si se pide, es porque ese estado lo usa.
    if (pedido && clave !== 'unassigned') desincronizados.push(`${estadoCrudo}/${traceable}: se pide y no lo usa`)
  }
}
comprobar(`los ${ESTADOS.length * 2} casos cuadran`, desincronizados.length === 0,
  desincronizados.join(' · '))

comprobar('un vuelo embarcando no gasta el historial', !necesitaHistorial('boarding', false))
comprobar('un vuelo en el aire tampoco', !necesitaHistorial('enRoute', true))
comprobar('uno cancelado tampoco', !necesitaHistorial('canceled', false))
comprobar('pero uno sin avión asignado sí', necesitaHistorial('expected', false))

// ---------------------------------------------------------------------------
bloque('Tope de gasto diario (que nadie funda el mes en una tarde)')

// Se simula el proveedor para no gastar cuota de verdad. El vuelo va
// cancelado y sin avión, de modo que cada búsqueda hace UNA sola llamada
// (2 unidades) y no arrastra pausas de ritmo.
// Esta prueba provoca a propósito un error, y el código lo registra en
// consola. Se silencia mientras dura, para que la salida siga siendo legible.
const fetchDeVerdad = globalThis.fetch
const avisoDeVerdad = console.warn
const errorDeVerdad = console.error
console.warn = () => {}
console.error = () => {}
let llamadasAlProveedor = 0
globalThis.fetch = async () => {
  llamadasAlProveedor++
  return new Response(
    JSON.stringify([
      {
        number: 'XX1', status: 'Canceled', aircraft: null,
        departure: { scheduledTime: hora('10:00'), airport: { iata: 'VLC', municipalityName: 'Valencia' } },
        arrival: { scheduledTime: hora('12:00'), airport: { iata: 'BCN', municipalityName: 'Barcelona' } },
      },
    ]),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

const entorno = { AERODATABOX_KEY: 'de-mentira', PRESUPUESTO_DIARIO: '4' }
const buscar = (code, ip) =>
  handleFlightRequest(new Request(`https://x/api/flight?code=${code}`), entorno, ip)

const r1 = await buscar('AA101', 'ip-a')
const r2 = await buscar('AA102', 'ip-b')
const r3 = await buscar('AA103', 'ip-c')

comprobar('la primera búsqueda pasa', r1.status === 200, `HTTP ${r1.status}`)
comprobar('la segunda agota el tope de 4 unidades', r2.status === 200, `HTTP ${r2.status}`)
comprobar('la tercera se corta sola', r3.status === 503, `HTTP ${r3.status}`)
comprobar('y no llegó a llamar al proveedor', llamadasAlProveedor === 2,
  `${llamadasAlProveedor} llamadas`)

const cuerpo = await r3.json()
comprobar('el usuario no ve nada de cuotas ni presupuestos',
  cuerpo.error === 'provider_error' && !('message' in cuerpo),
  JSON.stringify(cuerpo))

// La caché evita volver a gastar por el mismo vuelo.
const repetida = await buscar('AA101', 'ip-d')
comprobar('repetir un vuelo ya consultado no gasta',
  repetida.status === 200 && llamadasAlProveedor === 2, `${llamadasAlProveedor} llamadas`)

globalThis.fetch = fetchDeVerdad
console.warn = avisoDeVerdad
console.error = errorDeVerdad

// ---------------------------------------------------------------------------
bloque('Registro de predicciones (el dato que sostiene el argumento)')

/** Base de datos de mentira: apunta qué se ejecutó y con qué parámetros. */
function baseFalsa() {
  const ejecutado = []
  const filas = new Map()
  return {
    ejecutado,
    DB: {
      prepare(sql) {
        let params = []
        return {
          bind(...p) { params = p; return this },
          async run() { ejecutado.push({ sql, params }); return { success: true } },
          async first() {
            ejecutado.push({ sql, params })
            if (!/INSERT INTO gasto/.test(sql)) return null
            const [dia, unidades] = params
            const antes = filas.get(dia) ?? 0
            filas.set(dia, antes + unidades)
            return { unidades: antes + unidades, avisado: 0 }
          },
        }
      },
    },
  }
}

const enTierra = {
  code: 'IB 1082', status: 'expected',
  route: { from: { iata: 'VLC' }, to: { iata: 'MAD' } },
  departure: { scheduled: '17:40', revised: '17:45' },
  arrival: { scheduled: '18:50', revised: '18:35', predicted: '18:59' },
}

const base1 = baseFalsa()
await guardarPrediccion(base1, enTierra, '2026-11-24')
const inserts = base1.ejecutado.filter((e) => /INSERT INTO predicciones/.test(e.sql))
comprobar('guarda la predicción de un vuelo que aún no ha salido', inserts.length === 1)
comprobar('sin espacios en el número', inserts[0]?.params[0] === 'IB1082', inserts[0]?.params[0])
comprobar('guarda lo que dice la aerolínea y lo que predice el proveedor',
  inserts[0]?.params.includes('18:35') && inserts[0]?.params.includes('18:59'))
comprobar('NO guarda nada que identifique a nadie',
  !JSON.stringify(inserts[0]?.params).match(/\d+\.\d+\.\d+\.\d+/))

// Lo importante: no apuntar como "predicción" algo que ya ha ocurrido.
for (const estado of ['departed', 'enRoute', 'approaching', 'arrived']) {
  const b = baseFalsa()
  await guardarPrediccion(b, { ...enTierra, status: estado }, '2026-11-24')
  comprobar(`no apunta hindsight con el vuelo en estado "${estado}"`,
    b.ejecutado.filter((e) => /INSERT INTO predicciones/.test(e.sql)).length === 0)
}

const base2 = baseFalsa()
await completarReales(base2, { ...enTierra, status: 'arrived' }, '2026-11-24')
comprobar('cierra la fila cuando el vuelo ya aterrizó',
  base2.ejecutado.some((e) => /UPDATE predicciones/.test(e.sql)))

const base3 = baseFalsa()
await completarReales(base3, enTierra, '2026-11-24')
comprobar('no la cierra si todavía no ha aterrizado',
  !base3.ejecutado.some((e) => /UPDATE predicciones/.test(e.sql)))

// El contador de gasto, ahora compartido de verdad.
const base4 = baseFalsa()
const g1 = await sumarGasto(base4, 2)
const g2 = await sumarGasto(base4, 6)
comprobar('el gasto se acumula entre llamadas', g1.unidades === 2 && g2.unidades === 8,
  `${g1?.unidades} luego ${g2?.unidades}`)
comprobar('sin base de datos devuelve null (y se usa el contador en memoria)',
  (await sumarGasto({}, 2)) === null)

// ---------------------------------------------------------------------------
bloque('Modo recoger')

const vueloRecogida = {
  status: 'enRoute',
  route: { to: { iata: 'MAD' } },
  arrival: { scheduled: '18:50', revised: '18:35', predicted: '18:59' },
}

comprobar('se ofrece cuando hay hora de llegada', sePuedeRecoger(vueloRecogida))
comprobar('no se ofrece en un vuelo cancelado', !sePuedeRecoger({ ...vueloRecogida, status: 'canceled' }))
comprobar('no se ofrece sin hora de llegada', !sePuedeRecoger({ status: 'enRoute', route: { to: {} }, arrival: {} }))

const plan = planDeRecogida(vueloRecogida, 25, true, '17:00')
comprobar('usa la predicción, no la hora de la aerolínea', plan.aterriza === '18:59', plan.aterriza)
comprobar('la hora de salir de casa sale bien', plan.salDeCasa === '19:34', plan.salDeCasa)
comprobar('avisa del desfase con la aerolínea', plan.desfaseMin === 24, String(plan.desfaseMin))

const yaTarde = planDeRecogida(vueloRecogida, 25, true, '19:40')
comprobar('detecta que ya tendría que haber salido', yaTarde.margenMin < 0 && yaTarde.salYa,
  `margen=${yaTarde.margenMin}`)

// La tarjeta del vuelo y el modo recoger llegaron a enseñar horas distintas
// para lo mismo. Las dos tienen que salir de la misma función.
comprobar('la espera en terminal es una sola cuenta',
  esperaEnTerminal('MAD', true) === plan.esperaEnTerminal,
  `${esperaEnTerminal('MAD', true)} vs ${plan.esperaEnTerminal}`)

// ---------------------------------------------------------------------------
bloque('Modo "Es mi vuelo"')

const miVuelo = (revisada = '18:25') => ({
  status: 'expected',
  route: { from: { iata: 'VLC' } },
  departure: { scheduled: '18:25', revised: revisada },
})

comprobar('se ofrece en un vuelo que aún no ha salido', sePuedeVolar(miVuelo()))
comprobar('NO se ofrece si ya despegó', !sePuedeVolar({ ...miVuelo(), status: 'enRoute' }))
comprobar('NO se ofrece si está cancelado', !sePuedeVolar({ ...miVuelo(), status: 'canceled' }))

const sinMaleta = planDeSalida(miVuelo(), 45, false, '12:00')
comprobar('sin maleta sale más tarde de casa', sinMaleta.salDeCasa === '16:50', sinMaleta.salDeCasa)

const conMaleta = planDeSalida(miVuelo(), 45, true, '12:00')
comprobar('facturar maleta adelanta la salida', conMaleta.salDeCasa === '16:25', conMaleta.salDeCasa)
comprobar('la antelación sale de la tabla del aeropuerto',
  conMaleta.antelacion === antelacionEn('VLC', true))

// Si la aerolínea retrasa el vuelo, madrugar de más no tiene sentido.
const conRetrasoDeAerolinea = planDeSalida(miVuelo('20:00'), 45, true, '12:00')
comprobar('un retraso de la aerolínea retrasa la hora de salir', conRetrasoDeAerolinea.salDeCasa === '18:00',
  conRetrasoDeAerolinea.salDeCasa)
comprobar('y se avisa de que la hora ha cambiado', conRetrasoDeAerolinea.retrasada === true)
comprobar('sin retraso no se avisa de nada', sinMaleta.retrasada === false)

const salidaTarde = planDeSalida(miVuelo(), 45, true, '17:50')
comprobar('detecta que ya tendría que haber salido', salidaTarde.margenMin < 0 && salidaTarde.salYa,
  `margen=${salidaTarde.margenMin}`)

// ---------------------------------------------------------------------------
bloque('Datos de ejemplo completos (faltaba la llegada en 9 de 11)')

for (const [idioma, fixtures] of [['es', FIXTURES_ES], ['en', FIXTURES_EN]]) {
  const sinLlegada = Object.entries(fixtures).filter(([, f]) => !f.arrival?.scheduled)
  comprobar(`${idioma}: los ${Object.keys(fixtures).length} escenarios traen hora de llegada`,
    sinLlegada.length === 0, sinLlegada.map(([k]) => k).join(', '))
}

// ---------------------------------------------------------------------------
bloque('Textos: ninguna clave puede faltar en un idioma')

const clavesDe = (obj, prefijo = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function'
      ? clavesDe(v, `${prefijo}${k}.`)
      : [`${prefijo}${k}`],
  )

const soloEs = clavesDe(es).filter((k) => !clavesDe(en).includes(k))
const soloEn = clavesDe(en).filter((k) => !clavesDe(es).includes(k))
comprobar('el inglés no se deja ninguna clave', soloEs.length === 0, soloEs.join(', '))
comprobar('el español no se deja ninguna clave', soloEn.length === 0, soloEn.join(', '))

// ---------------------------------------------------------------------------
bloque('El servidor no puede caerse sin dejar rastro (incidencia del 28/11/2026)')

const { readFileSync } = await import('node:fs')
const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8')

const servicio = leer('src/lib/flightService.js')
const funcion = leer('functions/api/flight.js')
const clienteApi = leer('src/data/flightApi.js')

// Un import() dinámico queda en un archivo aparte que el empaquetador de
// Cloudflare Functions no sube: la función reventaba al ejecutarlo, y encima
// estaba fuera del try, así que salía la página de Cloudflare sin cabeceras.
const sinComentarios = (texto) => texto.replace(/^\s*(\/\/|\*|\/\*).*$/gm, '')
comprobar('el servidor no usa import() dinámico',
  !/await\s+import\s*\(/.test(sinComentarios(servicio)),
  'vuelve a haber un import dinámico en flightService.js')

// Sin esto, cualquier caída se ve como «error code: 502» en texto plano: el
// navegador no lo puede leer y nos quedamos sin saber qué ha fallado.
comprobar('la función envuelve todo en try/catch y responde JSON',
  /try\s*{/.test(funcion) && /catch/.test(funcion) && /application\/json/.test(funcion),
  'functions/api/flight.js se ha quedado sin red de seguridad')

comprobar('una caída deja el motivo en una cabecera',
  /x-isitlate-crash/.test(funcion), 'falta la cabecera de diagnóstico')

// El fallo más grave de todos: un error del servidor enseñaba un vuelo de
// ejemplo con horas inventadas como si fuera el que el usuario había buscado.
// Cloudflare sustituye el cuerpo de CUALQUIER 502 por su propia página de
// texto plano, sin cabeceras. El navegador no la puede leer. Comprobado en
// producción: con 503 la respuesta llega intacta, con 502 desaparece.
comprobar('el servidor no usa nunca el estado 502',
  !/,\s*502\b/.test(sinComentarios(servicio)) && !/status:\s*502\b/.test(sinComentarios(funcion)),
  'ha vuelto un 502: Cloudflare se comerá la respuesta')

comprobar('los datos de ejemplo NO tapan fallos en producción',
  /OFFLINE_FALLBACK = Boolean\(import\.meta\.env\?\.DEV\)/.test(clienteApi),
  'OFFLINE_FALLBACK vuelve a estar activo en producción')

// ---------------------------------------------------------------------------
console.log(`\n${fallos === 0 ? '✅' : '❌'} ${pruebas - fallos}/${pruebas} comprobaciones correctas`)
process.exit(fallos === 0 ? 0 : 1)
