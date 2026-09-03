/**
 * Escenarios de ejemplo para España, uno por estado, en la forma interna.
 *
 * Las etiquetas de la rotación son estructuradas (`{ kind, ... }`) y las pinta
 * el idioma activo, no el fixture: así el mismo escenario sirve en cualquier
 * lengua y el adaptador podrá construirlas igual con datos reales.
 *
 * `status` usa el enum FlightStatus de AeroDataBox.
 */
const leg = (airport, iata, state, tag) => ({ airport, iata, state, tag })

export const DEMO_CODE = 'FR1234'

export const FIXTURES = {
  late: {
    code: 'FR1234', status: 'delayed', airline: 'Ryanair',
    route: { from: { city: 'Valencia', iata: 'VLC' }, to: { city: 'Londres', iata: 'LON' } },
    departure: { scheduled: '20:30', revised: '21:00', terminal: 'N1', gate: null },
    aircraft: { reg: 'EI-HAT', model: 'Boeing 737 MAX 8-200', ageYears: 3.2 },
    delayMin: 36, turnaroundMin: 25, estimate: { from: '20:55', to: '21:15' },
    rotation: [
      leg('Dublín', 'DUB', 'done', { kind: 'tookOff', time: '14:46' }),
      leg('Mallorca', 'PMI', 'active', { kind: 'inFlight' }),
      leg('Valencia', 'VLC', 'pending', { kind: 'pending' }),
      leg('Londres', 'LON', 'final', { kind: 'yourFlight' }),
    ],
  },

  parked: {
    code: 'IB3200', status: 'expected', airline: 'Iberia',
    route: { from: { city: 'Madrid', iata: 'MAD' }, to: { city: 'Barcelona', iata: 'BCN' } },
    departure: { scheduled: '21:00', revised: null, terminal: 'T4', gate: 'K52' },
    aircraft: { reg: 'EC-MXV', model: 'Airbus A320neo', ageYears: 5.1 },
    delayMin: 0, turnaroundMin: 115, minTurnaroundMin: 40, parkedSince: '19:05', estimate: null,
    rotation: [
      leg('Palma', 'PMI', 'done', { kind: 'tookOff', time: '17:35' }),
      leg('Madrid', 'MAD', 'done', { kind: 'landed', time: '19:05' }),
      leg('Barcelona', 'BCN', 'final', { kind: 'yourFlight' }),
    ],
  },

  overnight: {
    code: 'VY1802', status: 'expected', airline: 'Vueling',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'Sevilla', iata: 'SVQ' } },
    departure: { scheduled: '07:15', revised: null, terminal: 'T1', gate: 'B22' },
    aircraft: { reg: 'EC-NIX', model: 'Airbus A320', ageYears: 6.8 },
    delayMin: 0, turnaroundMin: null, lastFlewAt: 'ayer a las 22:40', estimate: null,
    rotation: [
      leg('Barcelona', 'BCN', 'done', { kind: 'overnight' }),
      leg('Sevilla', 'SVQ', 'final', { kind: 'yourFlight' }),
    ],
  },

  onTime: {
    code: 'UX1094', status: 'expected', airline: 'Air Europa',
    route: { from: { city: 'Madrid', iata: 'MAD' }, to: { city: 'Mallorca', iata: 'PMI' } },
    departure: { scheduled: '19:40', revised: null, terminal: 'T2', gate: 'D14' },
    aircraft: { reg: 'EC-NCJ', model: 'Boeing 737-800', ageYears: 9.4 },
    delayMin: 5, turnaroundMin: 50, minTurnaroundMin: 25, estimate: null,
    rotation: [
      leg('Valencia', 'VLC', 'active', { kind: 'inFlightEta', time: '18:45' }),
      leg('Madrid', 'MAD', 'pending', { kind: 'layover', min: 50 }),
      leg('Mallorca', 'PMI', 'final', { kind: 'yourFlight' }),
    ],
  },

  risk: {
    code: 'FR5423', status: 'expected', airline: 'Ryanair',
    route: { from: { city: 'Málaga', iata: 'AGP' }, to: { city: 'Londres', iata: 'STN' } },
    departure: { scheduled: '18:20', revised: null, terminal: 'T3', gate: null },
    aircraft: { reg: 'EI-DYG', model: 'Boeing 737-800', ageYears: 14.6 },
    delayMin: 22, turnaroundMin: 30, minTurnaroundMin: 25, tippingPoint: '17:50',
    estimate: { from: '18:25', to: '18:50' },
    rotation: [
      leg('Bérgamo', 'BGY', 'done', { kind: 'tookOff', time: '13:10', delay: 22 }),
      leg('Málaga', 'AGP', 'active', { kind: 'inFlightEta', time: '17:50' }),
      leg('Londres', 'STN', 'final', { kind: 'yourFlight' }),
    ],
  },

  canceled: {
    code: 'VY6501', status: 'canceled', airline: 'Vueling',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'París', iata: 'ORY' } },
    departure: { scheduled: '16:45', revised: null, terminal: 'T1', gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, distanceKm: 830, estimate: null, rotation: [],
  },

  canceledUncertain: {
    code: 'TO3456', status: 'canceledUncertain', airline: 'Transavia',
    route: { from: { city: 'Sevilla', iata: 'SVQ' }, to: { city: 'Ámsterdam', iata: 'AMS' } },
    departure: { scheduled: '13:05', revised: null, terminal: null, gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, lastCheckedMin: 2, estimate: null, rotation: [],
  },

  diverted: {
    code: 'IB0512', status: 'diverted', airline: 'Iberia',
    route: { from: { city: 'Bilbao', iata: 'BIO' }, to: { city: 'Madrid', iata: 'MAD' } },
    departure: { scheduled: '20:10', revised: '22:30', terminal: 'T4', gate: null },
    aircraft: { reg: 'EC-MER', model: 'Airbus A320', ageYears: 11.2 },
    delayMin: 140, turnaroundMin: null, extraKm: 320, estimate: null,
    rotation: [
      leg('Madrid', 'MAD', 'done', { kind: 'tookOff', time: '18:15' }),
      leg('Zaragoza', 'ZAZ', 'active', { kind: 'divertedHere', why: 'niebla en Bilbao' }),
      leg('Bilbao', 'BIO', 'pending', { kind: 'pending' }),
      leg('Madrid', 'MAD', 'final', { kind: 'yourFlight' }),
    ],
  },

  unassigned: {
    code: 'FR9876', status: 'unknown', airline: 'Ryanair',
    route: { from: { city: 'Alicante', iata: 'ALC' }, to: { city: 'Dublín', iata: 'DUB' } },
    departure: { scheduled: '11:25', revised: null, terminal: null, gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, knownBy: '08:30', estimate: null, rotation: [],
  },

  gone: {
    code: 'IB3101', status: 'enRoute', airline: 'Iberia',
    route: { from: { city: 'Barcelona', iata: 'BCN' }, to: { city: 'Madrid', iata: 'MAD' } },
    departure: { scheduled: '21:00', revised: '21:12', terminal: 'T1', gate: 'A08' },
    aircraft: { reg: 'EC-JFH', model: 'Airbus A321', ageYears: 18.3 },
    delayMin: 12, turnaroundMin: null, hasCheckedBags: false,
    estimate: { from: '22:35', to: '22:45' },
    rotation: [
      leg('Madrid', 'MAD', 'done', { kind: 'tookOff', time: '19:20' }),
      leg('Barcelona', 'BCN', 'done', { kind: 'landed', time: '20:31' }),
      leg('Madrid', 'MAD', 'final', { kind: 'yourFlightAirborne' }),
    ],
  },
}
