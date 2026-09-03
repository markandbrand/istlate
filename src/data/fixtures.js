/**
 * Escenarios de ejemplo, uno por estado, ya en la FORMA INTERNA de la app.
 *
 * La forma interna es la que consume la interfaz. El adaptador
 * (src/lib/adapter.js) traduce la respuesta del proveedor a esto, de modo que
 * cambiar de proveedor no toca ni un componente.
 *
 * `status` usa el vocabulario del enum FlightStatus de AeroDataBox:
 *   expected · checkIn · boarding · gateClosed · departed · enRoute ·
 *   approaching · arrived · delayed · diverted · canceled ·
 *   canceledUncertain · unknown
 */

/** Un tramo de la rotación. state: done | active | pending | final */
const leg = (airport, iata, state, tag) => ({ airport, iata, state, tag })

export const FIXTURES = {
  // ── El escenario original de la demo ────────────────────────────────
  late: {
    code: 'FR1234',
    status: 'delayed',
    airline: 'Ryanair',
    route: { from: { city: 'Valencia', iata: 'VLC' }, to: { city: 'Londres', iata: 'LON' } },
    departure: { scheduled: '20:30', revised: '21:00', terminal: 'N1', gate: null },
    aircraft: { reg: 'EI-HAT', model: 'Boeing 737 MAX 8-200', ageYears: 3.2 },
    delayMin: 36,
    turnaroundMin: 25,
    estimate: { from: '20:55', to: '21:15' },
    rotation: [
      leg('Dublín', 'DUB', 'done', 'Despegó · 14:46'),
      leg('Mallorca', 'PMI', 'active', '✈️ En vuelo ahora mismo'),
      leg('Valencia', 'VLC', 'pending', 'Pendiente'),
      leg('Londres', 'LON', 'final', '🎯 Tu vuelo'),
    ],
  },

  // ── Todo en orden, en sus tres sabores ──────────────────────────────
  parked: {
    code: 'IB3200',
    status: 'expected',
    airline: 'Iberia',
    route: { from: { city: 'Madrid', iata: 'MAD' }, to: { city: 'Barcelona', iata: 'BCN' } },
    departure: { scheduled: '21:00', revised: null, terminal: 'T4', gate: 'K52' },
    aircraft: { reg: 'EC-MXV', model: 'Airbus A320neo', ageYears: 5.1 },
    delayMin: 0,
    turnaroundMin: 115,
    minTurnaroundMin: 40,
    parkedSince: '19:05',
    estimate: null,
    rotation: [
      leg('Palma', 'PMI', 'done', 'Despegó · 17:35'),
      leg('Madrid', 'MAD', 'done', '🛬 Aterrizó · 19:05'),
      leg('Barcelona', 'BCN', 'final', '🎯 Tu vuelo'),
    ],
  },

  overnight: {
    code: 'VY1802',
    status: 'expected',
    airline: 'Vueling',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'Sevilla', iata: 'SVQ' } },
    departure: { scheduled: '07:15', revised: null, terminal: 'T1', gate: 'B22' },
    aircraft: { reg: 'EC-NIX', model: 'Airbus A320', ageYears: 6.8 },
    delayMin: 0,
    turnaroundMin: null,
    lastFlewAt: 'ayer a las 22:40',
    estimate: null,
    rotation: [
      leg('Barcelona', 'BCN', 'done', '🌙 Ha pasado la noche aquí'),
      leg('Sevilla', 'SVQ', 'final', '🎯 Tu vuelo'),
    ],
  },

  onTime: {
    code: 'UX1094',
    status: 'expected',
    airline: 'Air Europa',
    route: { from: { city: 'Madrid', iata: 'MAD' }, to: { city: 'Mallorca', iata: 'PMI' } },
    departure: { scheduled: '19:40', revised: null, terminal: 'T2', gate: 'D14' },
    aircraft: { reg: 'EC-NCJ', model: 'Boeing 737-800', ageYears: 9.4 },
    delayMin: 5,
    turnaroundMin: 50,
    minTurnaroundMin: 25,
    estimate: null,
    rotation: [
      leg('Valencia', 'VLC', 'active', '✈️ En vuelo, aterriza sobre las 18:45'),
      leg('Madrid', 'MAD', 'pending', 'Escala de 50 min'),
      leg('Mallorca', 'PMI', 'final', '🎯 Tu vuelo'),
    ],
  },

  // ── Zona de riesgo ──────────────────────────────────────────────────
  risk: {
    code: 'FR5423',
    status: 'expected',
    airline: 'Ryanair',
    route: { from: { city: 'Málaga', iata: 'AGP' }, to: { city: 'Londres', iata: 'STN' } },
    departure: { scheduled: '18:20', revised: null, terminal: 'T3', gate: null },
    aircraft: { reg: 'EI-DYG', model: 'Boeing 737-800', ageYears: 14.6 },
    delayMin: 22,
    turnaroundMin: 30,
    minTurnaroundMin: 25,
    tippingPoint: '17:50',
    estimate: { from: '18:25', to: '18:50' },
    rotation: [
      leg('Bérgamo', 'BGY', 'done', 'Despegó · 13:10 (+22 min)'),
      leg('Málaga', 'AGP', 'active', '✈️ En vuelo, aterriza sobre las 17:50'),
      leg('Londres', 'STN', 'final', '🎯 Tu vuelo'),
    ],
  },

  // ── Malas noticias: aquí el tono cambia ─────────────────────────────
  canceled: {
    code: 'VY6501',
    status: 'canceled',
    airline: 'Vueling',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'París', iata: 'ORY' } },
    departure: { scheduled: '16:45', revised: null, terminal: 'T1', gate: null },
    aircraft: null,
    delayMin: 0,
    turnaroundMin: null,
    distanceKm: 830,
    estimate: null,
    rotation: [],
  },

  canceledUncertain: {
    code: 'TO3456',
    status: 'canceledUncertain',
    airline: 'Transavia',
    route: { from: { city: 'Sevilla', iata: 'SVQ' }, to: { city: 'Ámsterdam', iata: 'AMS' } },
    departure: { scheduled: '13:05', revised: null, terminal: null, gate: null },
    aircraft: null,
    delayMin: 0,
    turnaroundMin: null,
    lastCheckedMin: 2,
    estimate: null,
    rotation: [],
  },

  diverted: {
    code: 'IB0512',
    status: 'diverted',
    airline: 'Iberia',
    route: { from: { city: 'Bilbao', iata: 'BIO' }, to: { city: 'Madrid', iata: 'MAD' } },
    departure: { scheduled: '20:10', revised: '22:30', terminal: 'T4', gate: null },
    aircraft: { reg: 'EC-MER', model: 'Airbus A320', ageYears: 11.2 },
    delayMin: 140,
    turnaroundMin: null,
    extraKm: 320,
    estimate: null,
    rotation: [
      leg('Madrid', 'MAD', 'done', 'Despegó · 18:15'),
      leg('Zaragoza', 'ZAZ', 'active', '↩️ Desviado aquí por niebla en Bilbao'),
      leg('Bilbao', 'BIO', 'pending', 'Pendiente'),
      leg('Madrid', 'MAD', 'final', '🎯 Tu vuelo'),
    ],
  },

  // ── Todavía no hay avión asignado ───────────────────────────────────
  unassigned: {
    code: 'FR9876',
    status: 'unknown',
    airline: 'Ryanair',
    route: { from: { city: 'Alicante', iata: 'ALC' }, to: { city: 'Dublín', iata: 'DUB' } },
    departure: { scheduled: '11:25', revised: null, terminal: null, gate: null },
    aircraft: null,
    delayMin: 0,
    turnaroundMin: null,
    knownBy: '08:30',
    estimate: null,
    rotation: [],
  },

  // ── Alguien consulta un vuelo que ya salió (viene a recoger a alguien) ─
  gone: {
    code: 'IB3101',
    status: 'enRoute',
    airline: 'Iberia',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'Madrid', iata: 'MAD' } },
    departure: { scheduled: '21:00', revised: '21:12', terminal: 'T1', gate: 'A08' },
    aircraft: { reg: 'EC-JFH', model: 'Airbus A321', ageYears: 18.3 },
    delayMin: 12,
    turnaroundMin: null,
    hasCheckedBags: false,
    estimate: { from: '22:35', to: '22:45' },
    rotation: [
      leg('Madrid', 'MAD', 'done', 'Despegó · 19:20'),
      leg('Barcelona', 'BCN', 'done', '🛬 Aterrizó · 20:31'),
      leg('Madrid', 'MAD', 'final', '✈️ Tu vuelo, en el aire'),
    ],
  },
}

export const DEMO_CODE = FIXTURES.late.code

/** Los escenarios en el orden en que tienen sentido enseñarlos. */
export const SCENARIOS = [
  { key: 'late', label: 'Va tarde' },
  { key: 'risk', label: 'Riesgo' },
  { key: 'onTime', label: 'En hora' },
  { key: 'parked', label: 'Ya está aquí' },
  { key: 'overnight', label: 'Durmió aquí' },
  { key: 'gone', label: 'Ya salió' },
  { key: 'unassigned', label: 'Sin avión aún' },
  { key: 'diverted', label: 'Desviado' },
  { key: 'canceledUncertain', label: 'Cancelación sin confirmar' },
  { key: 'canceled', label: 'Cancelado' },
]

/** Busca un escenario por su número de vuelo; si no, devuelve el de la demo. */
export function fixtureForCode(code) {
  const normalized = (code || '').trim().toUpperCase()
  const match = Object.values(FIXTURES).find((f) => f.code === normalized)
  return match ?? { ...FIXTURES.late, code: normalized || DEMO_CODE }
}
