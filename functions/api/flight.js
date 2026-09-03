// Cloudflare Pages Functions: la ruta la da la ubicación del archivo (/api/flight).
import { handleFlightRequest } from '../../src/lib/flightService.js'

export const onRequestGet = ({ request, env }) =>
  handleFlightRequest(request, env, request.headers.get('CF-Connecting-IP') ?? 'anon')
