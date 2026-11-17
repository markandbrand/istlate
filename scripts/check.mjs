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
import { deriveVerdict } from '../src/lib/verdict.js'
import { planDeRecogida, sePuedeRecoger } from '../src/lib/pickup.js'
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
console.log(`\n${fallos === 0 ? '✅' : '❌'} ${pruebas - fallos}/${pruebas} comprobaciones correctas`)
process.exit(fallos === 0 ? 0 : 1)
