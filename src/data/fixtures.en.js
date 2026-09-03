/**
 * Sample scenarios for the US market, one per state, in the internal shape.
 *
 * These are deliberately NOT translations of the Spanish ones: US carriers,
 * hub-and-spoke routes, N-number tails and 24h canonical times that the
 * formatter renders as 8:30 PM. A demo full of Madrid–Barcelona hops reads
 * foreign to the audience we are selling to here.
 */
const leg = (airport, iata, state, tag) => ({ airport, iata, state, tag })

export const DEMO_CODE = 'AA1732'

export const FIXTURES = {
  late: {
    code: 'AA1732', status: 'delayed', airline: 'American',
    route: { from: { city: 'Austin', iata: 'AUS' }, to: { city: 'Chicago', iata: 'ORD' } },
    departure: { scheduled: '20:30', revised: '21:00', terminal: 'C', gate: null },
    aircraft: { reg: 'N823AA', model: 'Boeing 737 MAX 8', ageYears: 3.2 },
    delayMin: 36, turnaroundMin: 25, estimate: { from: '20:55', to: '21:15' },
    rotation: [
      leg('Phoenix', 'PHX', 'done', { kind: 'tookOff', time: '14:46' }),
      leg('Denver', 'DEN', 'active', { kind: 'inFlight' }),
      leg('Austin', 'AUS', 'pending', { kind: 'pending' }),
      leg('Chicago', 'ORD', 'final', { kind: 'yourFlight' }),
    ],
  },

  parked: {
    code: 'DL1200', status: 'expected', airline: 'Delta',
    route: { from: { city: 'Atlanta', iata: 'ATL' }, to: { city: 'New York', iata: 'LGA' } },
    departure: { scheduled: '21:00', revised: null, terminal: 'B', gate: 'B14' },
    aircraft: { reg: 'N351DN', model: 'Airbus A321neo', ageYears: 5.1 },
    delayMin: 0, turnaroundMin: 115, minTurnaroundMin: 40, parkedSince: '19:05', estimate: null,
    rotation: [
      leg('Orlando', 'MCO', 'done', { kind: 'tookOff', time: '17:35' }),
      leg('Atlanta', 'ATL', 'done', { kind: 'landed', time: '19:05' }),
      leg('New York', 'LGA', 'final', { kind: 'yourFlight' }),
    ],
  },

  overnight: {
    code: 'WN482', status: 'expected', airline: 'Southwest',
    route: { from: { city: 'Denver', iata: 'DEN' }, to: { city: 'Phoenix', iata: 'PHX' } },
    departure: { scheduled: '07:15', revised: null, terminal: 'C', gate: 'C38' },
    aircraft: { reg: 'N7825A', model: 'Boeing 737-800', ageYears: 6.8 },
    delayMin: 0, turnaroundMin: null, lastFlewAt: 'yesterday at 10:40 PM', estimate: null,
    rotation: [
      leg('Denver', 'DEN', 'done', { kind: 'overnight' }),
      leg('Phoenix', 'PHX', 'final', { kind: 'yourFlight' }),
    ],
  },

  onTime: {
    code: 'UA694', status: 'expected', airline: 'United',
    route: { from: { city: 'Chicago', iata: 'ORD' }, to: { city: 'Denver', iata: 'DEN' } },
    departure: { scheduled: '19:40', revised: null, terminal: '1', gate: 'B6' },
    aircraft: { reg: 'N26210', model: 'Boeing 737-900ER', ageYears: 9.4 },
    delayMin: 5, turnaroundMin: 50, minTurnaroundMin: 25, estimate: null,
    rotation: [
      leg('Cleveland', 'CLE', 'active', { kind: 'inFlightEta', time: '18:45' }),
      leg('Chicago', 'ORD', 'pending', { kind: 'layover', min: 50 }),
      leg('Denver', 'DEN', 'final', { kind: 'yourFlight' }),
    ],
  },

  risk: {
    code: 'NK1145', status: 'expected', airline: 'Spirit',
    route: { from: { city: 'Fort Lauderdale', iata: 'FLL' }, to: { city: 'Newark', iata: 'EWR' } },
    departure: { scheduled: '18:20', revised: null, terminal: '4', gate: null },
    aircraft: { reg: 'N905NK', model: 'Airbus A320', ageYears: 14.6 },
    delayMin: 22, turnaroundMin: 30, minTurnaroundMin: 25, tippingPoint: '17:50',
    estimate: { from: '18:25', to: '18:50' },
    rotation: [
      leg('Detroit', 'DTW', 'done', { kind: 'tookOff', time: '13:10', delay: 22 }),
      leg('Fort Lauderdale', 'FLL', 'active', { kind: 'inFlightEta', time: '17:50' }),
      leg('Newark', 'EWR', 'final', { kind: 'yourFlight' }),
    ],
  },

  canceled: {
    code: 'AA4501', status: 'canceled', airline: 'American',
    route: { from: { city: 'Charlotte', iata: 'CLT' }, to: { city: 'Boston', iata: 'BOS' } },
    departure: { scheduled: '16:45', revised: null, terminal: 'E', gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, distanceKm: 1120, estimate: null, rotation: [],
  },

  canceledUncertain: {
    code: 'F91580', status: 'canceledUncertain', airline: 'Frontier',
    route: { from: { city: 'Las Vegas', iata: 'LAS' }, to: { city: 'Cleveland', iata: 'CLE' } },
    departure: { scheduled: '13:05', revised: null, terminal: null, gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, lastCheckedMin: 2, estimate: null, rotation: [],
  },

  diverted: {
    code: 'AS512', status: 'diverted', airline: 'Alaska',
    route: { from: { city: 'Boise', iata: 'BOI' }, to: { city: 'Seattle', iata: 'SEA' } },
    departure: { scheduled: '20:10', revised: '22:30', terminal: 'N', gate: null },
    aircraft: { reg: 'N624AS', model: 'Boeing 737-900', ageYears: 11.2 },
    delayMin: 140, turnaroundMin: null, extraKm: 515, estimate: null,
    rotation: [
      leg('Seattle', 'SEA', 'done', { kind: 'tookOff', time: '18:15' }),
      leg('Spokane', 'GEG', 'active', { kind: 'divertedHere', why: 'fog in Boise' }),
      leg('Boise', 'BOI', 'pending', { kind: 'pending' }),
      leg('Seattle', 'SEA', 'final', { kind: 'yourFlight' }),
    ],
  },

  unassigned: {
    code: 'UA2201', status: 'unknown', airline: 'United',
    route: { from: { city: 'Newark', iata: 'EWR' }, to: { city: 'San Francisco', iata: 'SFO' } },
    departure: { scheduled: '11:25', revised: null, terminal: 'C', gate: null },
    aircraft: null, delayMin: 0, turnaroundMin: null, knownBy: '08:30', estimate: null, rotation: [],
  },

  gone: {
    code: 'DL2101', status: 'enRoute', airline: 'Delta',
    route: { from: { city: 'New York', iata: 'LGA' }, to: { city: 'Atlanta', iata: 'ATL' } },
    departure: { scheduled: '21:00', revised: '21:12', terminal: 'C', gate: 'C28' },
    aircraft: { reg: 'N195DN', model: 'Boeing 757-200', ageYears: 18.3 },
    delayMin: 12, turnaroundMin: null, hasCheckedBags: false,
    estimate: { from: '22:35', to: '22:45' },
    rotation: [
      leg('Atlanta', 'ATL', 'done', { kind: 'tookOff', time: '19:20' }),
      leg('New York', 'LGA', 'done', { kind: 'landed', time: '20:31' }),
      leg('Atlanta', 'ATL', 'final', { kind: 'yourFlightAirborne' }),
    ],
  },
}
