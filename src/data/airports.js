/**
 * Cuánto se tarda, en cada aeropuerto, desde que el avión toca tierra hasta
 * que la persona cruza la puerta de llegadas.
 *
 * Son tres tramos:
 *   · rodaje  — de tocar pista a abrir la puerta del avión;
 *   · sala    — de bajar del avión a cruzar llegadas, sin maleta facturada;
 *   · maleta  — lo que añade esperar en la cinta, cuando la hay.
 *
 * ⚠️ AVISO IMPORTANTE SOBRE ESTOS NÚMEROS
 *
 * No están medidos. Son estimaciones de partida, puestas con criterio
 * conservador, porque el producto necesita decir una hora desde el primer día
 * y no tenemos todavía datos propios de cuánto tarda la gente en salir.
 *
 * Es el único sitio de todo el proyecto donde hay números que no vienen del
 * proveedor, y por eso están aquí aislados y no repartidos por el código: el
 * día que midamos de verdad, se cambian aquí y ya está.
 *
 * Cómo afinarlos cuando haya datos: el proveedor publica `runwayTime` (hora
 * real de pista) y, en algunos aeropuertos, `baggageBelt`. Con eso y con lo
 * que nos cuente la gente se pueden sustituir por medias reales.
 *
 * Se peca de generoso a propósito: que alguien espere diez minutos de más en
 * el aeropuerto es una molestia; que llegue tarde y deje a alguien tirado en
 * la acera con una maleta es un fallo del producto.
 */

/** Lo que se aplica a cualquier aeropuerto del que no sepamos nada. */
export const POR_DEFECTO = { rodajeMin: 10, salaMin: 12, maletaMin: 25 }

/**
 * Aeropuertos donde el tamaño de la terminal cambia bastante el cálculo.
 * Clave IATA. Todo lo que no esté aquí usa POR_DEFECTO.
 *
 * Estimados, no medidos: ver el aviso de arriba.
 */
export const AEROPUERTOS = {
  // Barajas T4 y su satélite T4S son de los recorridos más largos de Europa.
  MAD: { rodajeMin: 14, salaMin: 18, maletaMin: 28 },
  // El Prat T1 también tiene tiradas largas hasta llegadas.
  BCN: { rodajeMin: 12, salaMin: 15, maletaMin: 26 },
  // Aeropuertos grandes y conocidos por la espera de maletas.
  LHR: { rodajeMin: 14, salaMin: 18, maletaMin: 30 },
  CDG: { rodajeMin: 14, salaMin: 18, maletaMin: 30 },
  // Aeropuertos pequeños: se sale casi andando del avión.
  SVQ: { rodajeMin: 7, salaMin: 8, maletaMin: 20 },
  VLC: { rodajeMin: 7, salaMin: 8, maletaMin: 20 },
  BIO: { rodajeMin: 7, salaMin: 8, maletaMin: 20 },
}

/** Los tiempos del aeropuerto pedido, con los de por defecto de reserva. */
export function tiemposDe(iata) {
  return AEROPUERTOS[iata] ?? POR_DEFECTO
}

/**
 * Minutos desde que el avión toca tierra hasta que la persona cruza llegadas.
 *
 * La usan tanto el veredicto (para el estado "ya ha salido") como el modo
 * recoger. Vive aquí, y no en cada uno, porque tenerla duplicada hizo que la
 * tarjeta del vuelo y el modo recoger enseñaran dos horas distintas para lo
 * mismo en la misma pantalla.
 */
export function esperaEnTerminal(iata, conMaleta) {
  const t = tiemposDe(iata)
  return t.rodajeMin + t.salaMin + (conMaleta ? t.maletaMin : 0)
}
