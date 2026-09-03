import { FORMATTERS } from './format.js'

const f = FORMATTERS.en

export default {
  code: 'en',
  htmlLang: 'en',
  documentTitle: 'IsItLate? — Is your plane running late?',
  label: 'English',

  ui: {
    eyebrow: '● demo mode · sample data',
    h1: [
      { text: 'Is your plane' },
      { br: true },
      { text: 'running late', highlight: true },
      { text: '?' },
    ],
    sub: "Skip the airline fine print. We'll tell you where your plane actually is right now, the way a friend who works the ramp would.",
    searchLabel: 'Flight number',
    searchButton: 'Am I late?',
    hint: "Try any flight number — it's a demo.",
    hintAction: (code) => `Use ${code}`,
    switcherTitle: 'Demo mode · tap to see each situation',
    switcherBlurb:
      "Without live data there's no way to make a cancellation or a diversion happen, so here are the ten situations this thing knows how to explain.",
    metaScheduled: 'Scheduled',
    metaTerminal: 'Terminal',
    metaGate: 'Gate',
    metaDelay: "Delay so far",
    noDelay: 'None',
    rotationTitle: "🧭 Where your plane's been today",
    loading: 'Looking up your flight…',
    errorTitle: 'We got lost',
    errorRetry: 'Try again',
    waitlistTitle: 'Want this for your next flight?',
    waitlistText:
      "This is just a demo running on sample data. Drop your email and we'll ping you when it goes live with the real thing.",
    waitlistPlaceholder: 'you@email.com',
    waitlistButton: 'Notify me',
    waitlistEmailLabel: 'Your email',
    waitlistThanks: "Thanks! We'll be in touch 🎉",
    footer: 'IsItLate? — demo on sample data · not wired up to a live flight provider yet',
    years: (n) => `${n.toLocaleString('en-US')} yrs`,
  },

  tag: {
    tookOff: (t, delay) => `Took off · ${f.time(t)}${delay ? ` (+${delay} min)` : ''}`,
    landed: (t) => `🛬 Landed · ${f.time(t)}`,
    inFlight: () => '✈️ In the air right now',
    inFlightEta: (t) => `✈️ In the air, lands around ${f.time(t)}`,
    pending: () => 'Still to come',
    layover: (min) => `${min} min on the ground`,
    overnight: () => '🌙 Sat here overnight',
    divertedHere: (why) => `↩️ Diverted here — ${why}`,
    yourFlight: () => '🎯 Your flight',
    yourFlightAirborne: () => '✈️ Your flight, in the air',
  },

  scenarios: {
    late: 'Running late',
    risk: 'Could go sideways',
    onTime: "You're good",
    parked: 'Already here',
    overnight: 'Slept here',
    gone: 'Already left',
    unassigned: 'No plane yet',
    diverted: 'Diverted',
    canceledUncertain: 'Unconfirmed cancellation',
    canceled: 'Canceled',
  },

  verdict: {
    unassigned: () => ({
      badge: 'Not known yet',
      emoji: '🕐',
      title: "Nobody knows which plane you're getting yet",
      text: "The airline hasn't assigned an aircraft to this flight yet. That usually locks in a few hours before departure, so check back later and we'll show you where it's been.",
      advice: "Leave your email and we'll ping you the second there's a tail number.",
    }),

    canceled: (fl) => ({
      badge: 'Canceled',
      emoji: null,
      title: 'Your flight is canceled',
      text: `${fl.airline} canceled the ${f.time(fl.departure.scheduled)} ${fl.code}. Get on the phone or the app to rebook — they have to either put you on another flight or give you your money back.`,
      advice: 'Screenshot your boarding pass and keep every email from the airline. That is the first thing they ask for.',
    }),

    canceledUncertain: (fl) => ({
      badge: 'Might be canceled',
      emoji: null,
      title: "We're seeing a cancellation, but it isn't official",
      text: `Something is telling us ${fl.code} got canceled, but the airline hasn't confirmed it. We're not going to scare you over nothing, and we're not going to let you get stranded either.`,
      advice: 'Call the airline before you head to the airport.',
    }),

    diverted: (fl, x) => ({
      badge: 'Plane diverted',
      emoji: '↩️',
      title: 'Your plane got diverted on the way here',
      text: `The aircraft that's supposed to fly you ended up at a different airport, and it still has to get here first. That means a long delay: it's ${f.plural(fl.delayMin, 'minute', 'minutes')} behind already.`,
      advice: `The airline moved your departure to ${f.time(x.departure)}. Confirm it before you leave.`,
    }),

    gone: (fl, x) => ({
      badge: x.landed ? 'Already landed' : 'Already left',
      emoji: x.landed ? '🛬' : '✈️',
      title: x.landed ? 'This flight is already on the ground' : 'This flight has already left',
      text: x.landed
        ? `${fl.code} is on the ground. If you're picking somebody up, go ahead and head down to arrivals.`
        : `It pushed back at ${f.time(x.departure)}${fl.delayMin > 0 ? `, ${f.plural(fl.delayMin, 'minute', 'minutes')} late` : ''}. ${fl.estimate ? `Lands around ${f.time(fl.estimate.from)}` : "It's in the air"}.`,
      advice: null,
    }),

    overnight: (fl, x) => ({
      badge: "You're good",
      emoji: '😴',
      title: 'Your plane slept here',
      text: "This is the aircraft's first flight of the day, so it isn't inheriting anybody else's bad morning. That's about as close to a guarantee as aviation gets.",
      advice: `Leave on your normal schedule — that ${f.time(x.departure)} departure is solid.`,
    }),

    parked: (fl, x) => ({
      badge: "You're good",
      emoji: '🛬',
      title: 'Your plane is already here, parked',
      text: `It's on the ground in ${fl.route.from.city} with time to spare before it leaves with you. Nothing upstream can mess this up — all that's left is cleaning and boarding.`,
      advice: `Head to the airport on your usual schedule for the ${f.time(x.departure)} departure.`,
    }),

    late: (fl, x) => ({
      badge: 'Probably, yeah',
      emoji: '✈️',
      title: "Heads up: this one's likely running late",
      text: `Your plane still has ${f.plural(x.pending, 'leg', 'legs')} to fly before it comes to get you, and it's already ${f.plural(fl.delayMin, 'minute', 'minutes')} behind for the day.`,
      advice: fl.estimate
        ? `Our call is you'll actually push back between ${f.time(fl.estimate.from)} and ${f.time(fl.estimate.to)}. No need to be at the airport before ${f.time(x.leaveBy)}.`
        : null,
    }),

    risk: (fl, x) => ({
      badge: 'Could go sideways',
      emoji: '🤔',
      title: "Fine so far, but I'd keep an eye on it",
      text: `Your plane is inbound and ${
        x.tightTurnaround
          ? `the turn here is only ${f.plural(fl.turnaroundMin, 'minute', 'minutes')}, which doesn't leave much room`
          : `it's carrying ${f.plural(fl.delayMin, 'minute', 'minutes')} of delay`
      }. Nothing dramatic yet, but this is the kind that goes sideways at the last minute.`,
      advice: `Check back before you leave the house, around ${f.time(x.checkBackAt)}.`,
    }),

    onTime: (fl, x) => ({
      badge: "You're good",
      emoji: '👌',
      title: "Everything says you're leaving on time",
      text: `Your plane is on its way in${x.inboundFrom ? ` from ${x.inboundFrom}` : ''} with nothing dragging behind it.${
        fl.turnaroundMin != null
          ? ` It gets ${f.plural(fl.turnaroundMin, 'minute', 'minutes')} on the ground here, plenty to turn it around.`
          : ''
      }`,
      advice: `Leave on your usual schedule for the ${f.time(x.departure)} departure.`,
    }),
  },

  panel: {
    parked: (fl, x) => ({
      label: '☕ In the meantime',
      cards: [
        { k: 'Parked since', v: f.time(fl.parkedSince) },
        { k: "Waiting on you for", v: f.duration(x.waitingMin), accent: true },
      ],
      note: "Your plane is taking a nap at the gate. That's the best news we know how to give.",
    }),

    overnight: (fl) => ({
      label: "🌙 Yesterday's baggage",
      cards: [
        { k: 'Last time it flew', v: fl.lastFlewAt },
        { k: "Delay it's inheriting", v: 'None', accent: true },
      ],
      note: "Whatever went wrong yesterday stayed in yesterday. Your plane starts the day fresh, and it starts it with you.",
    }),

    onTime: (fl) => ({
      label: '⏱️ How much room it has',
      cards: [
        { k: 'Needs to turn around', v: f.minutes(fl.minTurnaroundMin) },
        { k: 'Actually gets', v: f.minutes(fl.turnaroundMin), accent: true },
      ],
      note: `That's ${fl.turnaroundMin - fl.minTurnaroundMin} minutes to spare — enough to clean the cabin, fuel up, and let the captain grab a coffee.`,
    }),

    risk: (fl, x) => ({
      label: '👀 The number to watch',
      cards: [
        { k: 'If it lands before', v: f.time(fl.tippingPoint) },
        { k: 'You leave on time', v: f.time(x.departure), accent: true },
      ],
      note: "That's the exact moment your evening gets decided. We'll watch it so you don't have to.",
    }),

    late: (fl, x) => ({
      label: '🔮 Our call',
      cards: [
        { k: 'Airline says', v: f.time(x.departure) },
        { k: 'We say', v: `${f.time(fl.estimate.from)} – ${f.time(fl.estimate.to)}`, accent: true },
      ],
      note: null,
    }),

    diverted: (fl, x) => ({
      label: '🗺️ The detour it took',
      cards: [
        { k: 'Extra miles flown', v: f.distance(fl.extraKm) },
        { k: 'New departure', v: f.time(x.departure), accent: true },
      ],
      note: 'Your plane went sightseeing without you. Nobody else was going to tell you that straight.',
    }),

    unassigned: (fl, x) => ({
      label: '🕐 When to check back',
      cards: [
        { k: 'Usually known by', v: f.time(fl.knownBy) },
        { k: 'Scheduled departure', v: f.time(x.departure), accent: true },
      ],
      note: "Don't sit here hitting refresh. Leave your email and we'll write the moment there's a plane.",
    }),

    canceledUncertain: (fl) => ({
      label: '📡 How fresh this is',
      cards: [
        { k: 'Last checked', v: `${fl.lastCheckedMin} min ago` },
        { k: 'Official status', v: 'Unconfirmed', accent: true },
      ],
      note: "We'd rather tell you we're not sure than scare you over nothing or strand you at the airport.",
    }),

    /**
     * Estados Unidos NO tiene equivalente al 261/2004: no hay compensación por
     * cancelar. Lo que sí hay desde 2024 es la norma del DOT que obliga al
     * reembolso automático en efectivo, sea cual sea el motivo. Traducir el
     * panel europeo aquí sería prometer un dinero que no existe.
     */
    canceled: () => ({
      label: "⚖️ What you're owed",
      cards: [
        { k: 'Cash refund', v: 'Automatic', accent: true },
        { k: 'Card refunds within', v: '7 business days' },
      ],
      note: "Federal rules say a canceled flight means an automatic refund to your original payment method — cash, not a voucher — no forms and no phone calls, whatever the reason for the cancellation. Heads up: unlike Europe, the US has no payout on top of that. You get your money back, not a check for your trouble.",
    }),

    gone: (fl, x) => ({
      label: "🚪 If you're picking someone up",
      cards: [
        { k: 'Lands around', v: f.time(fl.estimate.from) },
        { k: 'Out the doors by', v: f.time(x.gateOutAt), accent: true },
      ],
      note: "Landing isn't getting out. There's taxi time, deplaning, and the hike through the terminal. Add 25 minutes if they checked a bag.",
    }),
  },
}
