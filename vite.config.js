import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleFlightRequest } from './src/lib/flightService.js'

/**
 * Monta /api/flight durante `npm run dev`.
 *
 * En producción esa ruta la sirve la función serverless del host; en local no
 * hay nada que la sirva, así que sin esto habría que instalar la CLI de
 * Netlify solo para probar la key. Es el mismo `handleFlightRequest`, de modo
 * que lo que pruebes en local es exactamente lo que se despliega.
 */
function apiDev(env) {
  return {
    name: 'isitlate-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/flight', async (req, res) => {
        const url = `http://localhost${req.originalUrl ?? req.url}`
        const ip = req.socket.remoteAddress ?? 'local'
        const response = await handleFlightRequest(new Request(url), env, ip)
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(await response.text())
      })
    },
  }
}

/**
 * Rellena %SITE_URL% en index.html con la dirección pública del sitio.
 *
 * Los rastreadores de WhatsApp y compañía no ejecutan JavaScript y exigen la
 * URL completa de la imagen de vista previa, así que no vale una ruta
 * relativa. El orden de preferencia:
 *   1. SITE_URL, que es lo que se pone a mano cuando haya dominio propio;
 *   2. CF_PAGES_URL, que Cloudflare define sola en cada despliegue;
 *   3. nada, y entonces queda relativa, que es lo correcto en local.
 */
function siteUrl(env) {
  const url = (env.SITE_URL || env.CF_PAGES_URL || '').replace(/\/$/, '')
  return {
    name: 'isitlate-site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  }
}

export default defineConfig(({ mode }) => {
  // El tercer argumento vacío carga TODAS las variables, no solo las VITE_*,
  // que es justo lo que queremos: la key nunca lleva ese prefijo.
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), tailwindcss(), apiDev(env), siteUrl(env)] }
})
