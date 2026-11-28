// TEMPORAL: ver qué vuelos se han consultado y cuándo, para saber de dónde
// salió el gasto del 28/11/2026. Solo lectura. Se borra al terminar.
//
// No hay nada personal que enseñar: la tabla guarda datos del vuelo, que son
// públicos, y a propósito no guarda ni IP ni identificador de quien busca.
export const onRequestGet = async ({ env }) => {
  const r = {}
  try {
    r.consultas = (await env.DB.prepare(
      `SELECT vuelo, fecha, consultado_en, origen, destino, estado
         FROM predicciones ORDER BY consultado_en DESC LIMIT 60`,
    ).all()).results
    r.cuantas = r.consultas.length
    r.porDia = (await env.DB.prepare(
      `SELECT substr(consultado_en, 1, 10) AS dia, COUNT(*) AS consultas
         FROM predicciones GROUP BY dia ORDER BY dia DESC`,
    ).all()).results
    r.gasto = (await env.DB.prepare('SELECT * FROM gasto ORDER BY dia DESC').all()).results
  } catch (err) {
    r.error = String(err?.message ?? err)
  }
  return new Response(JSON.stringify(r, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
