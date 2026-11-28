// TEMPORAL: diagnóstico de la caída del 28/11/2026. Borrar al cerrarla.
//
// Ejecuta uno a uno los pasos de una búsqueda, cada uno en su propio
// try/catch y con su tiempo, para ver cuál es el que tumba la función.
// No enseña la key: solo si está y cuántos caracteres tiene.
export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url)
  const pasos = Number(url.searchParams.get('pasos') ?? '1')
  const t0 = Date.now()
  const r = {
    key: Boolean(env?.AERODATABOX_KEY),
    keyLargo: env?.AERODATABOX_KEY ? String(env.AERODATABOX_KEY).length : 0,
    host: env?.AERODATABOX_HOST ?? '(sin variable)',
    db: Boolean(env?.DB?.prepare),
    vars: Object.keys(env ?? {}).sort(),
  }

  if (pasos >= 2) {
    const t = Date.now()
    try {
      const fila = await env.DB.prepare(
        `INSERT INTO gasto (dia, unidades) VALUES (?, 0)
         ON CONFLICT (dia) DO UPDATE SET unidades = unidades + 0
         RETURNING unidades, avisado`,
      ).bind('diag').first()
      r.d1 = { ok: true, fila, ms: Date.now() - t }
    } catch (err) {
      r.d1 = { ok: false, error: String(err?.message ?? err), ms: Date.now() - t }
    }
  }

  if (pasos >= 3) {
    const t = Date.now()
    const host = env?.AERODATABOX_HOST ?? 'aerodatabox.p.rapidapi.com'
    try {
      const res = await fetch(`https://${host}/health/services/feeds`, {
        headers: { 'x-rapidapi-key': env.AERODATABOX_KEY ?? '', 'x-rapidapi-host': host },
      })
      r.proveedor = { status: res.status, ms: Date.now() - t, cuerpo: (await res.text()).slice(0, 180) }
    } catch (err) {
      r.proveedor = { ok: false, error: String(err?.message ?? err), ms: Date.now() - t }
    }
  }

  r.msTotal = Date.now() - t0
  return new Response(JSON.stringify(r, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
