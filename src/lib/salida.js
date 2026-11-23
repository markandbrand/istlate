/**
 * Modo "Es mi vuelo": a qué hora tiene que salir de casa quien vuela.
 *
 * Es la otra mitad del modo recoger. La misma pregunta vista del otro lado:
 *
 *   quien recoge → ¿a qué hora salgo a buscarle?
 *   quien vuela  → ¿a qué hora salgo para no perderlo?
 *
 * El cálculo, de atrás hacia delante:
 *
 *   salida del vuelo  −  antelación en el aeropuerto  −  trayecto  =  salir de casa
 *
 * Y la diferencia con cualquier consejo genérico de "ve dos horas antes": si
 * la aerolínea mueve la hora o la predicción dice otra cosa, **esta hora se
 * recalcula sola**. No es un folleto, es una respuesta a tu vuelo concreto.
 */
import { antelacionEn } from '../data/airports.js'
import { minusMinutes, effectiveDeparture } from './verdict.js'

/** Por debajo de esto, decirle "sal ya" en vez de darle una hora. */
const YA_MIN = 10

/** Diferencia con signo entre dos horas "hh:mm", en minutos. */
function diferenciaConSigno(desde, hasta) {
  if (!desde || !hasta) return null
  const aMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let diff = aMin(hasta) - aMin(desde)
  if (diff > 720) diff -= 1440
  if (diff < -720) diff += 1440
  return diff
}

/** No se ofrece si el vuelo ya salió o está cancelado: no hay nada que planear. */
export function sePuedeVolar(flight) {
  if (!flight) return false
  if (['canceled', 'departed', 'enRoute', 'approaching', 'arrived'].includes(flight.status)) return false
  return Boolean(effectiveDeparture(flight))
}

/** Hora local actual en "hh:mm". Aislada para poder fijarla en las pruebas. */
function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * @param {object} flight       vuelo en la forma interna
 * @param {number} trayectoMin  lo que tarda en llegar al aeropuerto, en minutos
 * @param {boolean} conMaleta   si va a facturar maleta
 * @param {string} [ahora]      hora actual "hh:mm"; solo para poder probarlo
 */
export function planDeSalida(flight, trayectoMin, conMaleta, ahora = null) {
  // La hora que manda es la revisada por la aerolínea si la hay, porque es a
  // la que va a cerrar la puerta de verdad. Si tu vuelo se retrasa una hora,
  // salir de casa una hora antes no tiene sentido.
  const salida = effectiveDeparture(flight)
  if (!salida) return null

  const antelacion = antelacionEn(flight.route?.from?.iata, conMaleta)
  const enElAeropuerto = minusMinutes(salida, antelacion)
  const salDeCasa = minusMinutes(enElAeropuerto, trayectoMin)

  const reloj = ahora ?? horaActual()
  const margenMin = diferenciaConSigno(reloj, salDeCasa)

  return {
    salida,
    // Si la aerolínea ha movido la hora, merece decirlo: es el motivo de que
    // la respuesta no sea la que esperaba.
    retrasada: Boolean(flight.departure?.revised && flight.departure.revised !== flight.departure.scheduled),
    programada: flight.departure?.scheduled ?? null,
    enElAeropuerto,
    salDeCasa,
    antelacion,
    trayectoMin,
    conMaleta,
    aeropuerto: flight.route?.from?.iata ?? null,
    margenMin,
    salYa: margenMin != null && margenMin <= YA_MIN,
  }
}
