// Datos de ejemplo. La forma de este objeto es la que esperamos devolver
// desde el backend cuando conectemos un proveedor de datos de vuelo real.
export const DEMO_CODE = 'FR1234'

export const demoFlight = {
  code: DEMO_CODE,
  route: { from: 'Valencia', to: 'Londres' },
  verdict: 'Probablemente sí',
  answer: {
    emoji: '✈️',
    title: 'Spoiler: puede que vaya con retraso',
    text: 'Tu avión todavía está volando de Dublín a Mallorca, y tiene que hacer una escala más antes de venir a por ti.',
  },
  meta: [
    { label: 'Salida oficial', value: '20:30' },
    { label: 'Terminal', value: 'N1' },
    { label: 'Puerta', value: '—' },
    { label: 'Retraso acum.', value: '+36 min' },
  ],
  aircraft: {
    model: 'Boeing 737 MAX 8-200',
    detail: 'EI-XXX · 3,2 años · Ryanair',
  },
  // La rotación del avión: por dónde anda antes de venir a por ti.
  // status: 'done' | 'active' | 'pending' | 'final'
  rotation: [
    { airport: 'Dublín', iata: 'DUB', status: 'done', tag: 'Despegó · 14:46' },
    { airport: 'Mallorca', iata: 'PMI', status: 'active', tag: '✈️ En vuelo ahora mismo' },
    { airport: 'Valencia', iata: 'VLC', status: 'pending', tag: 'Pendiente' },
    { airport: 'Londres', iata: 'LON', status: 'final', tag: '🎯 Tu vuelo' },
  ],
  forecast: {
    airline: '21:00',
    ours: '20:55 – 21:15',
    why: 'El avión todavía tiene que completar el tramo Mallorca → Valencia antes de venir a por ti, y ya lleva 36 minutos de retraso acumulado hoy.',
  },
}

// Mientras no haya API real, cualquier número de vuelo devuelve la misma
// rotación de ejemplo, solo que rotulada con el código que ha escrito la persona.
export function lookupFlight(code) {
  const normalized = (code || '').trim().toUpperCase()
  return { ...demoFlight, code: normalized || DEMO_CODE }
}
