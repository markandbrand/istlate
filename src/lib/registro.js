/**
 * Lo que guardamos en la base de datos (Cloudflare D1).
 *
 * Dos cosas, y las dos hacen falta por el mismo motivo: en serverless no hay
 * una memoria compartida. Cada instancia del servidor tenía su propia cuenta
 * de gasto y su propia caché, así que el tope diario frenaba una avalancha
 * pero no la cortaba, y las predicciones se perdían al reciclarse el proceso.
 *
 *   1. Las predicciones, para poder medir algún día si acertamos más que la
 *      aerolínea. Es la única forma de saberlo, y los datos CADUCAN: la
 *      predicción de hoy no se puede recuperar mañana.
 *   2. El gasto de unidades del proveedor, compartido de verdad.
 *
 * Sin base de datos configurada, todo esto no hace nada y la web funciona
 * igual que antes. Así se puede desplegar hoy y enchufar D1 cuando toque.
 *
 * NO se guarda ningún dato personal: ni IP, ni identificador, ni nada que
 * diga quién buscó qué. Solo datos del vuelo, que son públicos.
 */

/** ¿Hay base de datos enchufada? */
export const hayBaseDeDatos = (env) => Boolean(env?.DB?.prepare)

/**
 * Apunta lo que cada uno predijo para este vuelo, una sola vez por día.
 *
 * Si ya hay fila, no se pisa: la primera predicción es la más valiosa, porque
 * es la que alguien tuvo delante cuando decidió a qué hora salir de casa.
 * Las posteriores ya saben más y compararlas sería hacer trampa.
 */
export async function guardarPrediccion(env, vuelo, fecha) {
  if (!hayBaseDeDatos(env) || !vuelo?.code) return
  // Solo se registra lo que todavía es una predicción. Si el vuelo ya se ha
  // movido, lo que vemos es el resultado, y apuntarlo como "lo que
  // predijimos" sería hacer trampa: mediríamos nuestra capacidad de adivinar
  // el pasado y saldríamos siempre ganando.
  if (['departed', 'enRoute', 'approaching', 'arrived'].includes(vuelo.status)) return
  const numero = vuelo.code.replace(/\s+/g, '').toUpperCase()
  try {
    await env.DB.prepare(
      `INSERT INTO predicciones (
         vuelo, fecha, consultado_en, origen, destino, estado,
         salida_programada, salida_aerolinea,
         llegada_programada, llegada_aerolinea, llegada_prediccion
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (vuelo, fecha) DO NOTHING`,
    )
      .bind(
        numero,
        fecha,
        new Date().toISOString(),
        vuelo.route?.from?.iata ?? null,
        vuelo.route?.to?.iata ?? null,
        vuelo.status ?? null,
        vuelo.departure?.scheduled ?? null,
        vuelo.departure?.revised ?? null,
        vuelo.arrival?.scheduled ?? null,
        vuelo.arrival?.revised ?? null,
        vuelo.arrival?.predicted ?? null,
      )
      .run()
  } catch (err) {
    // Que falle el registro no puede tumbar una búsqueda: esto es para
    // nosotros, el usuario viene a por su vuelo.
    console.warn('[isitlate] no se pudo guardar la predicción:', err.message)
  }
}

/**
 * Completa la hora real cuando el vuelo ya ha ocurrido.
 *
 * Es gratis: aprovecha que alguien ha buscado un vuelo ya aterrizado, cuya
 * respuesta trae las horas de verdad. No gasta ni una llamada extra al
 * proveedor. Cubre menos vuelos que un proceso programado, pero no cuesta
 * nada y empieza a dar datos desde hoy.
 */
export async function completarReales(env, vuelo, fecha) {
  if (!hayBaseDeDatos(env) || !vuelo?.code) return
  if (vuelo.status !== 'arrived') return
  const numero = vuelo.code.replace(/\s+/g, '').toUpperCase()
  const salidaReal = vuelo.departure?.revised ?? vuelo.departure?.scheduled ?? null
  const llegadaReal = vuelo.arrival?.revised ?? vuelo.arrival?.scheduled ?? null
  if (!llegadaReal) return
  try {
    await env.DB.prepare(
      `UPDATE predicciones
          SET salida_real = ?, llegada_real = ?, cerrado_en = ?
        WHERE vuelo = ? AND fecha = ? AND cerrado_en IS NULL`,
    )
      .bind(salidaReal, llegadaReal, new Date().toISOString(), numero, fecha)
      .run()
  } catch (err) {
    console.warn('[isitlate] no se pudo cerrar la predicción:', err.message)
  }
}

/**
 * Suma unidades al gasto del día y devuelve el total, de forma atómica.
 *
 * Atómica importa: con varias instancias atendiendo a la vez, leer-sumar-
 * escribir se pisa y el tope deja de valer. El INSERT ... ON CONFLICT lo
 * resuelve en una sola operación.
 *
 * Devuelve null si no hay base de datos, para que quien llama sepa que tiene
 * que apañarse con el contador en memoria.
 */
export async function sumarGasto(env, unidades) {
  if (!hayBaseDeDatos(env)) return null
  const dia = new Date().toISOString().slice(0, 10)
  try {
    const fila = await env.DB.prepare(
      `INSERT INTO gasto (dia, unidades) VALUES (?, ?)
       ON CONFLICT (dia) DO UPDATE SET unidades = unidades + excluded.unidades
       RETURNING unidades, avisado`,
    )
      .bind(dia, unidades)
      .first()
    return fila ? { unidades: fila.unidades, avisado: Boolean(fila.avisado) } : null
  } catch (err) {
    console.warn('[isitlate] no se pudo contar el gasto:', err.message)
    return null
  }
}

/**
 * Devuelve al contador unas unidades que al final no se van a gastar.
 *
 * Hace falta porque el apunte es atómico y por tanto va ANTES de comprobar el
 * tope: cuando el tope se pasa, la llamada no se hace pero ya está sumada. Sin
 * esto, cada intento bloqueado seguía inflando el contador y dejaba de medir
 * gasto real (204 unidades apuntadas para un tope de 60, el 28/11/2026).
 *
 * No baja de cero: más vale un contador prudente que uno en negativo.
 */
export async function devolverGasto(env, unidades) {
  if (!hayBaseDeDatos(env)) return
  const dia = new Date().toISOString().slice(0, 10)
  try {
    await env.DB.prepare(
      'UPDATE gasto SET unidades = MAX(0, unidades - ?) WHERE dia = ?',
    )
      .bind(unidades, dia)
      .run()
  } catch (err) {
    console.warn('[isitlate] no se pudo devolver el gasto:', err.message)
  }
}

/** Deja constancia de que ya se avisó, para no repetir el aviso cada búsqueda. */
export async function marcarAvisado(env) {
  if (!hayBaseDeDatos(env)) return
  const dia = new Date().toISOString().slice(0, 10)
  try {
    await env.DB.prepare('UPDATE gasto SET avisado = 1 WHERE dia = ?').bind(dia).run()
  } catch (err) {
    console.warn('[isitlate] no se pudo marcar el aviso:', err.message)
  }
}
