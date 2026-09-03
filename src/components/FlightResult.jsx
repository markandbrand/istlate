import PlaneIcon from './PlaneIcon.jsx'
import Rotation from './Rotation.jsx'
import { TONES } from '../lib/tones.js'
import { deriveVerdict } from '../lib/verdict.js'
import { useI18n } from '../i18n/index.jsx'

/** Los cuatro datos de cabecera, derivados del vuelo. */
function metaItems(flight, t, fmt) {
  return [
    { label: t.metaScheduled, value: fmt.time(flight.departure.scheduled) },
    { label: t.metaTerminal, value: flight.departure.terminal ?? '—' },
    { label: t.metaGate, value: flight.departure.gate ?? '—' },
    { label: t.metaDelay, value: flight.delayMin > 0 ? `+${flight.delayMin} min` : t.noDelay },
  ]
}

export default function FlightResult({ flight }) {
  const { copy, t, fmt } = useI18n()
  const verdict = deriveVerdict(flight, copy)
  const tone = TONES[verdict.tone]
  const { aircraft, rotation } = flight

  return (
    <div className="rounded-card bg-card p-7 shadow-soft">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 font-mono text-[13px] tracking-[0.06em] text-ink-dim">
            {flight.code}
            {flight.airline ? ` · ${flight.airline}` : ''}
          </div>
          <div className="font-display text-[25px] font-bold">
            {flight.route.from.city}{' '}
            <span className="mx-2 font-normal text-ink-dim">→</span>{' '}
            {flight.route.to.city}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-[15px] py-2 font-sans text-[13px] font-bold whitespace-nowrap ${tone.badge}`}
        >
          <span className={`h-[7px] w-[7px] rounded-full ${tone.dot}`} />
          {verdict.badge}
        </span>
      </div>

      <div className={`mb-[26px] rounded-2xl border-2 px-5 py-[18px] ${tone.banner}`}>
        <div className="flex items-start gap-[14px]">
          {verdict.emoji && <div className="text-[26px] leading-none">{verdict.emoji}</div>}
          <div>
            <b className="mb-[3px] block font-display text-[17px]">{verdict.title}</b>
            <span className="text-[14px] leading-[1.5] text-ink-dim">{verdict.text}</span>
          </div>
        </div>
        {verdict.advice && (
          <p
            className={`mt-3 mb-0 border-t border-white/70 pt-3 text-[13.5px] leading-[1.5] font-semibold text-ink ${
              verdict.emoji ? 'pl-[40px]' : ''
            }`}
          >
            👉 {verdict.advice}
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4 border-t border-b border-line py-4">
        {metaItems(flight, t, fmt).map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
              {item.label}
            </div>
            <div className="font-mono text-[15px] font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      {aircraft ? (
        <div className="mb-[26px] flex items-center gap-[14px] rounded-[14px] bg-blue-dim px-4 py-[14px]">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-white">
            <PlaneIcon size={22} />
          </div>
          <div>
            <div className="text-[14.5px] font-bold">{aircraft.model}</div>
            <div className="mt-0.5 font-mono text-[12.5px] text-ink-dim">
              {[
                aircraft.reg,
                aircraft.ageYears != null ? t.years(aircraft.ageYears) : null,
                flight.airline,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        </div>
      ) : null}

      {rotation.length > 0 && (
        <>
          <p className="mt-0 mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            {t.rotationTitle}
          </p>
          <Rotation legs={rotation} />
        </>
      )}

      {verdict.panel && (
        <>
          <p className="mt-0 mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            {verdict.panel.label}
          </p>
          <div className="mb-2 grid grid-cols-1 gap-3 min-[561px]:grid-cols-2">
            {verdict.panel.cards.map((card) => (
              <div
                key={card.k}
                className={`rounded-[14px] border-2 px-[18px] py-4 ${
                  card.accent ? tone.card : 'border-line bg-fc'
                }`}
              >
                <div className="mb-2 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
                  {card.k}
                </div>
                <div
                  className={`font-mono text-[19px] font-bold ${card.accent ? tone.cardValue : ''}`}
                >
                  {card.v}
                </div>
              </div>
            ))}
          </div>
          {verdict.panel.note && (
            <p className="mt-[14px] mb-[1em] text-[13.5px] leading-[1.6] text-ink-dim">
              {verdict.panel.note}
            </p>
          )}
        </>
      )}
    </div>
  )
}
