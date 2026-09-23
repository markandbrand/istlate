import { FORMATTERS } from './format.js'

const f = FORMATTERS.es

export default {
  code: 'es',
  htmlLang: 'es',
  documentTitle: 'IsItLate? — ¿Cómo va tu vuelo?',
  label: 'Español',

  ui: {
    realData: (when) => `Datos reales de este vuelo, consultados el ${when}`,
    eyebrow: '● modo demo · datos de ejemplo',
    h1: [
      { text: '¿Cómo va' },
      { br: true },
      { text: 'tu vuelo', highlight: true },
      { text: '?' },
    ],
    // Antes prometía contar "dónde anda el avión que viene a por ti". Las
    // mediciones contra el proveedor demostraron que eso no se puede saber
    // hasta que el avión despega, así que la promesa se ajusta a lo que sí
    // cumplimos: contar lo que de verdad va a pasar con el vuelo.
    sub: 'No leas letra pequeña de aerolínea. Te contamos, como lo haría un colega, lo que de verdad va a pasar con tu vuelo.',
    searchLabel: 'Número de vuelo',
    searchButton: '¿Va tarde?',
    hint: 'Prueba con cualquier número — es una demo.',
    hintAction: (code) => `Usar ${code}`,
    switcherTitle: 'Modo demo · pulsa para ver cada situación',
    switcherBlurb:
      'Sin datos reales no hay forma de provocar una cancelación o un desvío, así que aquí tienes los diez escenarios que el producto sabe contar.',
    metaScheduled: 'Salida oficial',
    metaTerminal: 'Terminal',
    metaGate: 'Puerta',
    metaDelay: 'Retraso acum.',
    noDelay: 'Ninguno',
    rotationTitle: '🧭 Antes de llegar a por ti',
    loading: 'Buscando tu vuelo…',
    errorTitle: 'Nos hemos perdido',
    errorRetry: 'Probar otra vez',
    waitlistTitle: '¿Te gustaría tenerlo para tu próximo vuelo?',
    waitlistText:
      'Esto es solo una demo con datos de ejemplo. Si te avisamos cuando esté listo con datos reales, deja tu email.',
    waitlistPlaceholder: 'tu@email.com',
    waitlistButton: 'Avísame',
    waitlistEmailLabel: 'Tu email',
    waitlistThanks: '¡Gracias! Te avisaremos 🎉',
    waitlistPurpose: 'Te escribiremos solo para avisarte del lanzamiento.',
    waitlistMarketing: 'Quiero recibir además consejos de vuelo y alguna recomendación ocasional.',
    waitlistLegalBefore: 'Puedes darte de baja cuando quieras. Más detalles en la ',
    waitlistLegalLink: 'política de privacidad',
    waitlistLegalAfter: '.',
    footer: 'IsItLate? — demo con datos de ejemplo · sin conexión a proveedores de vuelo reales todavía',
    years: (n) => `${n.toLocaleString('es-ES')} años`,
  },

  /** Etiquetas de los tramos de la rotación. */
  tag: {
    tookOff: (t, delay) => `Despegó · ${f.time(t)}${delay ? ` (+${delay} min)` : ''}`,
    landed: (t) => `🛬 Aterrizó · ${f.time(t)}`,
    inFlight: () => '✈️ En vuelo ahora mismo',
    inFlightEta: (t) => `✈️ En vuelo, aterriza sobre las ${f.time(t)}`,
    pending: () => 'Pendiente',
    layover: (min) => `Escala de ${min} min`,
    overnight: () => '🌙 Ha pasado la noche aquí',
    divertedHere: (why) => `↩️ Desviado aquí por ${why}`,
    yourFlight: () => '🎯 Tu vuelo',
    yourFlightAirborne: () => '✈️ Tu vuelo, en el aire',
  },

  scenarios: {
    boarding: 'Embarcando · real',
    late: 'Va tarde',
    risk: 'Riesgo',
    onTime: 'En hora',
    parked: 'Ya está aquí',
    overnight: 'Durmió aquí',
    gone: 'Ya salió',
    unassigned: 'Sin avión aún',
    diverted: 'Desviado',
    canceledUncertain: 'Cancelación sin confirmar',
    canceled: 'Cancelado',
  },

  verdict: {
    boarding: (fl, x) => ({
      badge: x.phase === 'gateClosed' ? 'Puerta cerrada' : 'Embarcando',
      emoji: x.phase === 'gateClosed' ? '🚪' : '🧳',
      title:
        x.phase === 'gateClosed'
          ? 'Puerta cerrada, tu avión está a punto de salir'
          : 'Ya están embarcando',
      text:
        x.predictedDelayMin >= 15
          ? `Sales prácticamente a tu hora, pero ojo con la llegada: la aerolínea dice una cosa y los datos de vuelo apuntan a ${f.plural(x.predictedDelayMin, 'minuto', 'minutos')} más tarde.`
          : 'Todo en orden y sin sorpresas a la vista. Buen vuelo.',
      advice:
        fl.departure.gate && x.phase !== 'gateClosed'
          ? `Puerta ${fl.departure.gate}. No te entretengas.`
          : null,
    }),
    unassigned: () => ({
      badge: 'Todavía no se sabe',
      emoji: '🕐',
      title: 'Aún no sabemos qué avión te toca',
      text: 'La aerolínea todavía no ha asignado avión a este vuelo, así que aún no podemos seguirle la pista a la rotación. Pero no te vas de vacío: abajo te contamos cómo se porta este vuelo habitualmente.',
      advice: 'Te avisamos en cuanto se sepa qué avión te toca, si nos dejas tu email.',
    }),

    canceled: (fl) => ({
      badge: 'Cancelado',
      emoji: null,
      title: 'Tu vuelo está cancelado',
      text: `La aerolínea ha cancelado el ${fl.code} de las ${f.time(fl.departure.scheduled)}. Contacta con ellos para que te reubiquen: tienen que ofrecerte transporte alternativo o el reembolso.`,
      advice: 'Guarda la tarjeta de embarque y los emails de la aerolínea: es lo primero que te piden si reclamas.',
    }),

    canceledUncertain: (fl) => ({
      badge: 'Podría estar cancelado',
      emoji: null,
      title: 'Nos consta como cancelado, pero sin confirmar',
      text: `Tenemos señales de que el ${fl.code} se ha cancelado, pero la aerolínea aún no lo ha confirmado oficialmente. No queremos darte un susto en falso ni dejarte tirado.`,
      advice: 'Llama a la aerolínea antes de salir hacia el aeropuerto.',
    }),

    diverted: (fl, x) => ({
      badge: 'Avión desviado',
      emoji: '↩️',
      title: 'Tu avión se ha desviado por el camino',
      text: `El avión que tiene que operar tu vuelo ha acabado en otro aeropuerto y todavía tiene que llegar hasta aquí. Esto se traduce en un retraso largo: ya lleva ${f.plural(fl.delayMin, 'minuto', 'minutos')} acumulados.`,
      advice: `La aerolínea ha revisado la salida a las ${f.time(x.departure)}. Confírmalo antes de ir.`,
    }),

    gone: (fl, x) => ({
      badge: x.landed ? 'Ya aterrizó' : 'Ya ha salido',
      emoji: x.landed ? '🛬' : '✈️',
      title: x.landed ? 'Este vuelo ya ha aterrizado' : 'Este vuelo ya ha salido',
      text: x.landed
        ? `El ${fl.code} ya está en tierra. Si vienes a recoger a alguien, ya puedes ir bajando.`
        : `Salió a las ${f.time(x.departure)}${fl.delayMin > 0 ? ` (${f.plural(fl.delayMin, 'minuto', 'minutos')} tarde)` : ''}. ${fl.estimate ? `Aterriza sobre las ${f.time(fl.estimate.from)}` : 'Ya está en el aire'}.`,
      advice: null,
    }),

    overnight: (fl, x) => ({
      badge: 'En hora',
      emoji: '😴',
      title: 'Tu avión ha dormido aquí',
      text: 'Es el primer vuelo del día de este avión, así que no arrastra retrasos de nadie. Es lo más parecido a una garantía que existe en aviación.',
      advice: `Sal de casa con el tiempo de siempre: la salida de las ${f.time(x.departure)} va a misa.`,
    }),

    parked: (fl, x) => ({
      badge: 'En hora',
      emoji: '🛬',
      title: 'Tu avión ya está aquí, aparcado',
      text: `Ya ha llegado a ${fl.route.from.city} y le sobra tiempo antes de salir contigo. No depende de ningún vuelo anterior: lo único que falta es que lo preparen.`,
      advice: `Puedes ir al aeropuerto con tu rutina normal para la salida de las ${f.time(x.departure)}.`,
    }),

    late: (fl, x) => ({
      badge: 'Probablemente sí',
      emoji: '✈️',
      title: 'Spoiler: puede que vaya con retraso',
      text: `Tu avión todavía tiene ${f.plural(x.pending, 'tramo', 'tramos')} por delante antes de venir a por ti, y ya lleva ${f.plural(fl.delayMin, 'minuto', 'minutos')} de retraso acumulado hoy.`,
      advice: fl.estimate
        ? `Nuestra estimación es que saldrás entre las ${f.time(fl.estimate.from)} y las ${f.time(fl.estimate.to)}. No hace falta que estés en el aeropuerto antes de las ${f.time(x.leaveBy)}.`
        : null,
    }),

    risk: (fl, x) => ({
      badge: 'Puede torcerse',
      emoji: '🤔',
      title: 'De momento bien, pero yo lo vigilaría',
      text: `Tu avión viene de camino y ${
        x.tightTurnaround
          ? `la escala aquí es de solo ${f.plural(fl.turnaroundMin, 'minuto', 'minutos')}, que da muy poco margen`
          : `arrastra ${f.plural(fl.delayMin, 'minuto', 'minutos')} de retraso`
      }. Nada dramático todavía, pero es de esos que se tuercen en el último momento.`,
      advice: `Vuelve a mirarlo antes de salir de casa hacia las ${f.time(x.checkBackAt)}.`,
    }),

    onTime: (fl, x) => ({
      badge: 'En hora',
      emoji: '👌',
      title: 'Todo apunta a que sales a tu hora',
      text: `Tu avión viene${x.inboundFrom ? ` de ${x.inboundFrom}` : ''} sin retrasos que arrastrar.${
        fl.turnaroundMin != null
          ? ` Le quedan ${f.plural(fl.turnaroundMin, 'minuto', 'minutos')} de escala aquí, de sobra para dar la vuelta.`
          : ''
      }`,
      advice: `Sal de casa con tu rutina de siempre para la salida de las ${f.time(x.departure)}.`,
    }),
  },

  panel: {
    boarding: (fl, x) => ({
      label: '🔮 Nuestra previsión',
      cards: [
        { k: 'Llegada según la aerolínea', v: f.time(fl.arrival.revised ?? fl.arrival.scheduled) },
        { k: 'Nuestra estimación', v: f.time(fl.arrival.predicted), accent: true },
      ],
      note:
        x.predictedDelayMin >= 15
          ? `La aerolínea aún no ha movido su hora, pero los datos de vuelo dicen ${f.plural(x.predictedDelayMin, 'minuto', 'minutos')} más. Si alguien viene a recogerte, avísale.`
          : 'Aerolínea y datos de vuelo coinciden. Nada que vigilar.',
    }),
    parked: (fl, x) => ({
      label: '☕ Mientras tanto',
      cards: [
        { k: 'Aparcado desde', v: f.time(fl.parkedSince) },
        { k: 'Lleva esperándote', v: f.duration(x.waitingMin), accent: true },
      ],
      note: 'Tu avión está echando la siesta en la puerta. Es la mejor noticia que te podemos dar.',
    }),

    overnight: (fl) => ({
      label: '🌙 Herencia del día anterior',
      cards: [
        { k: 'La última vez que voló', v: fl.lastFlewAt },
        { k: 'Retraso que hereda', v: 'Ninguno', accent: true },
      ],
      note: 'Todo el lío de ayer se quedó en ayer. Tu avión empieza el día de cero, y contigo.',
    }),

    onTime: (fl) => ({
      label: '⏱️ El margen que tiene',
      cards: [
        { k: 'Necesita para dar la vuelta', v: f.minutes(fl.minTurnaroundMin) },
        { k: 'Tiene', v: f.minutes(fl.turnaroundMin), accent: true },
      ],
      note: `Le sobran ${fl.turnaroundMin - fl.minTurnaroundMin} minutos. Da tiempo a limpiar la cabina, repostar y hasta a que el piloto se tome un café.`,
    }),

    risk: (fl, x) => ({
      label: '👀 El número a vigilar',
      cards: [
        { k: 'Si aterriza antes de', v: f.time(fl.tippingPoint) },
        { k: 'Sales a tu hora', v: f.time(x.departure), accent: true },
      ],
      note: 'Ese es el momento exacto en el que se decide tu tarde. Nosotros lo miramos por ti.',
    }),

    late: (fl, x) => ({
      label: '🔮 Nuestra previsión',
      cards: [
        { k: 'Dice la aerolínea', v: f.time(x.departure) },
        { k: 'Nuestra estimación', v: `${f.time(fl.estimate.from)} – ${f.time(fl.estimate.to)}`, accent: true },
      ],
      note: null,
    }),

    diverted: (fl, x) => ({
      label: '🗺️ La vuelta que ha dado',
      cards: [
        { k: 'Kilómetros de más', v: f.distance(fl.extraKm) },
        { k: 'Nueva salida', v: f.time(x.departure), accent: true },
      ],
      note: 'Tu avión ha hecho turismo sin ti. Nadie te lo iba a contar tan claro.',
    }),

    unassigned: (fl, x) => ({
      label: '📊 Cómo se porta este vuelo',
      cards: [
        { k: 'Sale puntual', v: `${x.punctuality}% de los días`, accent: true },
        { k: 'Retraso medio', v: x.avgDelay > 0 ? `+${x.avgDelay} min` : 'Ninguno' },
      ],
      strip: {
        caption: 'Últimos 7 días',
        days: x.days,
        legend: { onTime: 'Puntual (menos de 15 min)', late: 'Con retraso' },
      },
      note: 'Todavía no sabemos qué avión te tocará, pero sí sabemos cómo se comporta este vuelo normalmente. Cuando la aerolínea asigne avión, te contamos su rotación al detalle.',
    }),

    canceledUncertain: (fl) => ({
      label: '📡 Cómo de fresco es esto',
      cards: [
        { k: 'Última comprobación', v: `hace ${fl.lastCheckedMin} min` },
        { k: 'Estado oficial', v: 'Sin confirmar', accent: true },
      ],
      note: 'Preferimos decirte que no lo sabemos seguro antes que darte un susto en falso o dejarte tirado en el aeropuerto.',
    }),

    // Europa: reglamento (CE) 261/2004, compensación por tramos de distancia.
    canceled: (fl, x) => {
      if (!x.compensation) return null
      return {
      label: '⚖️ Lo que te pueden deber',
      cards: [
        { k: 'Distancia del vuelo', v: f.distance(fl.distanceKm) },
        { k: 'Compensación orientativa', v: x.compensation, accent: true },
      ],
      note: 'Orientativo: no se cobra si la causa es una circunstancia extraordinaria (temporal, huelga de control aéreo) ni si te avisaron con más de 14 días. El reembolso del billete sí te corresponde siempre.',
      }
    },

    gone: (fl, x) => ({
      label: '🚪 Si vienes a recoger a alguien',
      cards: [
        { k: 'Aterriza sobre las', v: f.time(fl.estimate.from) },
        { k: 'Sale por la puerta a las', v: f.time(x.gateOutAt), accent: true },
      ],
      note: 'Aterrizar no es salir: hay que rodar, desembarcar y cruzar la terminal. Suma 25 minutos más si lleva maleta facturada.',
    }),
  },
}
