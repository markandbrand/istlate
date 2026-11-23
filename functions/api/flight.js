// Cloudflare Pages Functions: la ruta la da la ubicación del archivo (/api/flight).
import { handleFlightRequest } from '../../src/lib/flightService.js'

export const onRequestGet = ({ request, env, waitUntil }) =>
  handleFlightRequest(
    request,
    env,
    request.headers.get('CF-Connecting-IP') ?? 'anon',
    // Permite registrar la predicción después de responder, sin que quien
    // busca su vuelo tenga que esperar a que se escriba en la base de datos.
    typeof waitUntil === 'function' ? waitUntil : null,
  )
