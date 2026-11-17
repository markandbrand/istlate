/**
 * Modo "Voy a recoger": a qué hora tiene que salir de casa quien espera.
 *
 * Es la función que diferencia a IsItLate. Las apps de vuelos piensan en el
 * pasajero; aquí se piensa en su pareja, sus padres o el amigo que va a
 * buscarle con el coche, que es quien de verdad no sabe a qué hora salir.
 *
 * El cálculo, de atrás hacia delante:
 *
 *   aterrizaje  →  + rodaje  →  + sala (+ maleta)  =  sale por llegadas
 *   sale por llegadas  −  trayecto de quien recoge  =  hora de salir de casa
 *
 * Aquí solo viven los números. Los textos están en src/i18n/<idioma>.js, igual
 * que con el veredicto, para que añadir un idioma no toque la lógica.
 */
import { esperaEnTerminal } from '../data/airports.js'
import { minusMinutes, plusMinutes } from './verdict.js'

/** Por debajo de esto, decirle "sal ya" en vez de darle una hora. */
const YA_MIN = 10

/**
 * Diferencia CON SIGNO entre dos horas "hh:mm", en minutos.
 *
 * `minutesBetween` de verdict.js no vale aquí: siempre devuelve positivo
 * porque da la vuelta a medianoche, así que una hora que ya ha pasado hace
 * diez minutos le sale como "dentro de 23 horas y 50 minutos". Para decidir
 * si alguien llega tarde hace falta el signo, y se resuelve igual que en el
 * adaptador: una diferencia de más de 12 horas es, en realidad, el pasado.
 */
function diferenciaConSigno(desde, hasta) {
  if (!desde || !hasta) return null
  const aMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = aMin(hasta) - aMin(desde)
  if (diff > 720) diff -= 1440
  if (diff < -720) diff += 1440
  return diff
}

/**
 * La mejor hora de aterrizaje que tengamos, por orden de fiabilidad.
 *
 * La predicción del proveedor manda sobre la hora revisada de la aerolínea:
 * es justo el desfase que medimos (23-24 minutos en los dos vuelos reales), y
 * aquí se nota más que en ningún sitio, porque un cuarto de hora es la
 * diferencia entre esperar en el coche o dejar a alguien tirado.
 */
export function horaDeAterrizaje(flight) {
  return (
    flight?.arrival?.predicted ??
    flight?.arrival?.revised ??
    flight?.arrival?.scheduled ??
    null
  )
}

/** Si no hay hora de llegada, no hay nada que calcular y no se ofrece el modo. */
export function sePuedeRecoger(flight) {
  if (!flight) return false
  if (flight.status === 'canceled') return false
  return Boolean(horaDeAterrizaje(flight))
}

/**
 * @param {object} flight       vuelo en la forma interna
 * @param {number} trayectoMin  lo que tarda quien recoge en llegar, en minutos
 * @param {boolean} conMaleta   si el pasajero lleva maleta facturada
 * @param {string} [ahora]      hora actual "hh:mm"; solo para poder probarlo
 */
export function planDeRecogida(flight, trayectoMin, conMaleta, ahora = null) {
  const aterriza = horaDeAterrizaje(flight)
  if (!aterriza) return null

  const espera = esperaEnTerminal(flight.route?.to?.iata, conMaleta)

  const salePorLlegadas = plusMinutes(aterriza, espera)
  const salDeCasa = minusMinutes(salePorLlegadas, trayectoMin)

  // ¿Llega tarde quien recoge? Se compara contra la hora real, cuando la hay.
  const reloj = ahora ?? horaActual()
  const margenMin = diferenciaConSigno(reloj, salDeCasa)

  return {
    aterriza,
    salePorLlegadas,
    salDeCasa,
    esperaEnTerminal: espera,
    trayectoMin,
    conMaleta,
    aeropuerto: flight.route?.to?.iata ?? null,
    // Negativo = ya tendría que haber salido. Entre 0 y YA_MIN = que salga ya.
    margenMin,
    salYa: margenMin != null && margenMin <= YA_MIN,
    // Si la aerolínea dice una hora y la predicción otra, merece decirse.
    desfaseMin: desfaseConLaAerolinea(flight),
  }
}

/**
 * Cuántos minutos separan la predicción del proveedor de lo que promete la
 * aerolínea. Es la tesis del producto, y en el modo recoger es un dato
 * accionable: son los minutos que alguien se habría comido esperando de pie.
 */
export function desfaseConLaAerolinea(flight) {
  const prometido = flight?.arrival?.revised
  const previsto = flight?.arrival?.predicted
  if (!prometido || !previsto) return 0
  return diferenciaConSigno(prometido, previsto) ?? 0
}

/** Hora local actual en "hh:mm". Aislada para poder fijarla en las pruebas. */
function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
