// Netlify Functions v2: recibe y devuelve Request/Response estándar.
import { handleFlightRequest } from '../../src/lib/flightService.js'

export default async (request, context) =>
  handleFlightRequest(
    request,
    process.env,
    context?.ip ?? 'anon',
    typeof context?.waitUntil === 'function' ? context.waitUntil.bind(context) : null,
  )

export const config = { path: '/api/flight' }
