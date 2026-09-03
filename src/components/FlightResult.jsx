import PlaneIcon from './PlaneIcon.jsx'
import Rotation from './Rotation.jsx'

export default function FlightResult({ flight }) {
  return (
    <div className="rounded-card bg-card p-7 shadow-soft">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 font-mono text-[13px] tracking-[0.06em] text-ink-dim">
            {flight.code}
          </div>
          <div className="font-display text-[25px] font-bold">
            {flight.route.from}{' '}
            <span className="mx-2 font-normal text-ink-dim">→</span>{' '}
            {flight.route.to}
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-coral-dim px-[15px] py-2 font-sans text-[13px] font-bold whitespace-nowrap text-coral-ink">
          <span className="h-[7px] w-[7px] rounded-full bg-coral" />
          {flight.verdict}
        </span>
      </div>

      <div className="mb-[26px] flex items-start gap-[14px] rounded-2xl border-2 border-coral-line bg-[linear-gradient(135deg,var(--color-coral-dim),#fff)] px-5 py-[18px]">
        <div className="text-[26px] leading-none">{flight.answer.emoji}</div>
        <div>
          <b className="mb-[3px] block font-display text-[17px]">{flight.answer.title}</b>
          <span className="text-[14px] leading-[1.5] text-ink-dim">{flight.answer.text}</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4 border-t border-b border-line py-4">
        {flight.meta.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
              {item.label}
            </div>
            <div className="font-mono text-[15px] font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-[26px] flex items-center gap-[14px] rounded-[14px] bg-blue-dim px-4 py-[14px]">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-white">
          <PlaneIcon size={22} />
        </div>
        <div>
          <div className="text-[14.5px] font-bold">{flight.aircraft.model}</div>
          <div className="mt-0.5 font-mono text-[12.5px] text-ink-dim">{flight.aircraft.detail}</div>
        </div>
      </div>

      <p className="mt-0 mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
        🧭 Antes de llegar a por ti
      </p>
      <Rotation legs={flight.rotation} />

      <p className="mt-0 mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
        🔮 Nuestra previsión
      </p>
      <div className="mb-2 grid grid-cols-1 gap-3 min-[561px]:grid-cols-2">
        <div className="rounded-[14px] border-2 border-line bg-fc px-[18px] py-4">
          <div className="mb-2 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
            Dice la aerolínea
          </div>
          <div className="font-mono text-[19px] font-bold">{flight.forecast.airline}</div>
        </div>
        <div className="rounded-[14px] border-2 border-coral-line bg-coral-dim px-[18px] py-4">
          <div className="mb-2 text-[11px] tracking-[0.06em] text-ink-dim uppercase">
            Nuestra estimación
          </div>
          <div className="font-mono text-[19px] font-bold text-coral-ink">{flight.forecast.ours}</div>
        </div>
      </div>
      <p className="mt-[14px] mb-[1em] text-[13.5px] leading-[1.6] text-ink-dim">{flight.forecast.why}</p>
    </div>
  )
}
