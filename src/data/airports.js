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


/* ═══════════════════════════════════════════════════════════════════════
   LADO DE LA SALIDA: cuánto hay que llegar antes
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Minutos de antelación con los que conviene plantarse en el aeropuerto.
 *
 * Mismo aviso que arriba: **no están medidos**, son estimaciones prudentes
 * para que el producto pueda dar una hora desde el primer día. Se pecan de
 * generosas a propósito, porque equivocarse por abajo aquí no es esperar un
 * rato: es perder el vuelo.
 *
 *   · control  — de entrar en la terminal a estar en la puerta de embarque,
 *                con la tarjeta ya sacada y sin maleta que facturar;
 *   · facturar — lo que añade pasar por el mostrador, que además cierra
 *                bastante antes de la hora de salida.
 *
 * Lo que NO contemplan todavía: el control de pasaportes de los vuelos fuera
 * del espacio Schengen, que añade un buen rato. Hace falta saber el país de
 * destino, y hasta ahora no lo guardábamos.
 */
export const SALIDA_POR_DEFECTO = { controlMin: 60, facturarMin: 30 }

/** Aeropuertos donde el tamaño o las colas cambian el cálculo. Clave IATA. */
export const SALIDAS = {
  MAD: { controlMin: 85, facturarMin: 35 }, // Barajas T4 y su satélite
  BCN: { controlMin: 75, facturarMin: 35 },
  LHR: { controlMin: 90, facturarMin: 40 },
  CDG: { controlMin: 90, facturarMin: 40 },
  // Aeropuertos pequeños: del aparcamiento a la puerta en un paseo
  VLC: { controlMin: 50, facturarMin: 25 },
  SVQ: { controlMin: 50, facturarMin: 25 },
  BIO: { controlMin: 50, facturarMin: 25 },
  AGP: { controlMin: 60, facturarMin: 30 },
  PMI: { controlMin: 60, facturarMin: 30 },
  ALC: { controlMin: 55, facturarMin: 25 },
}

/** Minutos antes de la salida a los que conviene estar en el aeropuerto. */
export function antelacionEn(iata, conMaleta) {
  const t = SALIDAS[iata] ?? SALIDA_POR_DEFECTO
  return t.controlMin + (conMaleta ? t.facturarMin : 0)
}
