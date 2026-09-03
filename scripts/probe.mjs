#!/usr/bin/env node
/**
 * Sonda de AeroDataBox.
 *
 * Contesta de una sola vez las dos preguntas que deciden el producto:
 *   1. ¿Viene rellena la matrícula (`aircraft.reg`) de un vuelo que aún no ha salido?
 *   2. ¿Qué forma exacta tiene la respuesta, para terminar el adaptador?
 *
 * Uso:
 *   npm run probe -- FR1234
 *   npm run probe -- FR1234 2026-09-04
 *
 * La ruta exacta de sus endpoints no está verificada, así que prueba varias
 * candidatas y te dice cuál funcionó.
 */
import fs from 'node:fs'
import path from 'node:path'

// ── .env sin dependencias ────────────────────────────────────────────
function loadEnv() {
  const file = path.join(process.cwd(), '.env')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const KEY = process.env.AERODATABOX_KEY
const HOST = process.env.AERODATABOX_HOST || 'aerodatabox.p.rapidapi.com'
const code = (process.argv[2] || '').trim().toUpperCase()
const date = process.argv[3] || new Date().toISOString().slice(0, 10)

if (!KEY) {
  console.error('\n✗ Falta AERODATABOX_KEY.\n')
  console.error('  Copia .env.example a .env y pega ahí tu key:')
  console.error('    cp .env.example .env\n')
  process.exit(1)
}
if (!code) {
  console.error('\n✗ Dime qué vuelo.  Ejemplo:  npm run probe -- FR1234\n')
  process.exit(1)
}

const esRapidApi = HOST.includes('rapidapi.com')
const headers = esRapidApi
  ? { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST, Accept: 'application/json' }
  : { 'x-magicapi-key': KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' }

/** Rutas candidatas: la primera que responda 200 es la buena. */
const CANDIDATAS = [
  `/flights/number/${code}/${date}`,
  `/flights/number/${code}`,
  `/flights/Number/${code}/${date}`,
]

async function intentar(ruta) {
  const url = `https://${HOST}${ruta}`
  try {
    const res = await fetch(url, { headers })
    const texto = await res.text()
    let cuerpo = null
    try {
      cuerpo = JSON.parse(texto)
    } catch {
      cuerpo = texto.slice(0, 300)
    }
    return { ruta, url, status: res.status, cuerpo }
  } catch (err) {
    return { ruta, url, status: 0, cuerpo: String(err) }
  }
}

const marca = (ok) => (ok ? '✓' : '✗')

console.log(`\n  Vuelo ${code} · fecha ${date} · host ${HOST}\n`)

let bueno = null
for (const ruta of CANDIDATAS) {
  const r = await intentar(ruta)
  console.log(`  ${marca(r.status === 200)} ${String(r.status).padEnd(3)} ${r.ruta}`)
  if (r.status === 200 && !bueno) bueno = r
  if (r.status === 401 || r.status === 403) {
    console.log(`\n  ✗ La key no vale para este host. Revisa AERODATABOX_KEY y AERODATABOX_HOST.\n`)
    process.exit(1)
  }
  if (r.status === 429) {
    console.log(`\n  ✗ Cuota agotada por hoy.\n`)
    process.exit(1)
  }
}

if (!bueno) {
  console.log(`\n  ✗ Ninguna ruta respondió 200.`)
  console.log(`    Abre el playground de AeroDataBox, lanza una consulta y copia la URL exacta.`)
  console.log(`    Pásamela y ajusto src/lib/flightService.js.\n`)
  process.exit(1)
}

const vuelos = Array.isArray(bueno.cuerpo) ? bueno.cuerpo : (bueno.cuerpo.flights ?? [bueno.cuerpo])
const v = vuelos[0]

console.log(`\n  ── Lo que ha vuelto ─────────────────────────────────────────\n`)
console.log(`  Ruta buena        ${bueno.ruta}`)
console.log(`  Vuelos devueltos  ${vuelos.length}`)
console.log(`  status            ${v?.status ?? '(no viene)'}`)
console.log(`  número            ${v?.number ?? '(no viene)'}`)
console.log(`  aerolínea         ${v?.airline?.name ?? '(no viene)'}`)

const reg = v?.aircraft?.reg
console.log(`\n  ${marca(Boolean(reg))} MATRÍCULA        ${reg ?? '— vacía —'}`)
console.log(`    modelo          ${v?.aircraft?.model ?? '(no viene)'}`)
console.log(`    modeS           ${v?.aircraft?.modeS ?? '(no viene)'}`)

console.log(`\n  Salida:`)
console.log(`    scheduledTime   ${JSON.stringify(v?.departure?.scheduledTime) ?? '(no viene)'}`)
console.log(`    revisedTime     ${JSON.stringify(v?.departure?.revisedTime) ?? '(no viene)'}`)
console.log(`    terminal/puerta ${v?.departure?.terminal ?? '—'} / ${v?.departure?.gate ?? '—'}`)

const salida = `probe-${code}-${date}.json`
fs.writeFileSync(salida, JSON.stringify(bueno.cuerpo, null, 2))
console.log(`\n  Respuesta completa guardada en ${salida}`)

if (reg) {
  console.log(`\n  → Hay matrícula. Ahora los tramos de ese avión hoy:`)
  const r2 = await intentar(`/flights/reg/${encodeURIComponent(reg)}/${date}`)
  console.log(`    ${marca(r2.status === 200)} ${r2.status} ${r2.ruta}`)
  if (r2.status === 200) {
    const tramos = Array.isArray(r2.cuerpo) ? r2.cuerpo : (r2.cuerpo.flights ?? [r2.cuerpo])
    console.log(`    ${tramos.length} tramos hoy:`)
    for (const t of tramos) {
      const de = t.departure?.airport?.iata ?? '???'
      const a = t.arrival?.airport?.iata ?? '???'
      console.log(`      ${String(t.number ?? '').padEnd(8)} ${de} → ${a}   ${t.status ?? ''}`)
    }
    fs.writeFileSync(`probe-${reg}-${date}.json`, JSON.stringify(r2.cuerpo, null, 2))
    console.log(`\n    Guardado en probe-${reg}-${date}.json`)
  }
} else {
  console.log(`\n  → Sin matrícula todavía. Repite la sonda más cerca de la salida:`)
  console.log(`    ese momento es el que define con cuánta antelación funciona IsItLate?.`)
}
console.log()
