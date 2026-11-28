// TEMPORAL: diagnóstico de la caída del 28/11/2026. Borrar al cerrarla.
//
// Ejecuta uno a uno los pasos de una búsqueda, cada uno en su propio
// try/catch y con su tiempo, para ver cuál es el que tumba la función.
// No enseña la key: solo si está y cuántos caracteres tiene.
export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url)
  const pasos = Number(url.searchParams.get('pasos') ?? '1')
  const t0 = Date.now()

  // ¿Cloudflare respeta el cuerpo de una respuesta nuestra con estado 5xx?
  const responder = url.searchParams.get('responder')
  if (responder) {
    return new Response(JSON.stringify({ sonda: true, estado: Number(responder) }), {
      status: Number(responder),
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-isitlate-sonda': 'si' },
    })
  }

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

  if (pasos >= 4) {
    // La llamada REAL, con la misma ruta y las mismas opciones que la web.
    const t = Date.now()
    const host = env?.AERODATABOX_HOST ?? 'aerodatabox.p.rapidapi.com'
    const fecha = new Date().toISOString().slice(0, 10)
    const opciones = 'withAircraftImage=false&withLocation=false&withFlightPlan=false&dateLocalRole=Both'
    const ruta = `/flights/number/${url.searchParams.get('code') ?? 'ZZ9999'}/${fecha}?${opciones}`
    try {
      const res = await fetch(`https://${host}${ruta}`, {
        headers: {
          'X-RapidAPI-Key': env.AERODATABOX_KEY,
          'X-RapidAPI-Host': host,
          Accept: 'application/json',
        },
      })
      const cuerpo = await res.text()
      r.vueloReal = { ruta, status: res.status, ms: Date.now() - t, bytes: cuerpo.length, cuerpo: cuerpo.slice(0, 200) }
    } catch (err) {
      r.vueloReal = { ruta, ok: false, error: String(err?.message ?? err), ms: Date.now() - t }
    }
  }

  if (pasos >= 5) {
    // El manejador completo, tal cual, pero recogiendo lo que devuelva.
    const t = Date.now()
    try {
      const { handleFlightRequest } = await import('../../src/lib/flightService.js')
      const falsa = new Request(`https://x/api/flight?code=${url.searchParams.get('code') ?? 'ZZ9999'}&date=${new Date().toISOString().slice(0, 10)}`)
      const res = await handleFlightRequest(falsa, env, 'diag', null)
      r.manejador = {
        status: res.status,
        ms: Date.now() - t,
        cabeceras: Object.fromEntries([...res.headers].filter(([k]) => k.startsWith('x-isitlate'))),
        cuerpo: (await res.text()).slice(0, 200),
      }
    } catch (err) {
      r.manejador = { ok: false, error: String(err?.message ?? err), pila: String(err?.stack ?? '').slice(0, 300), ms: Date.now() - t }
    }
  }

  // El contador de gasto real de hoy, para saber si el tope está agotado.
  try {
    const dia = new Date().toISOString().slice(0, 10)
    r.gastoHoy = await env.DB.prepare('SELECT dia, unidades, avisado FROM gasto ORDER BY dia DESC LIMIT 5').all()
      .then((x) => x.results)
    r.diaDeHoy = dia
  } catch (err) {
    r.gastoHoy = String(err?.message ?? err)
  }

  r.msTotal = Date.now() - t0
  return new Response(JSON.stringify(r, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
