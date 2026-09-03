const NODE_STYLES = {
  done: 'bg-track shadow-[0_0_0_2px_var(--color-track)]',
  active: 'bg-coral shadow-[0_0_0_4px_var(--color-coral-dim)]',
  pending: 'bg-white shadow-[0_0_0_2px_var(--color-line)]',
  final: 'bg-green shadow-[0_0_0_4px_var(--color-green-dim)]',
}

const STEM_STYLES = {
  done: 'bg-track',
  active: 'bg-[linear-gradient(to_bottom,var(--color-coral),var(--color-line))]',
  pending: 'bg-line',
  final: 'bg-line',
}

const TAG_STYLES = {
  done: 'bg-tag-done text-ink-dim',
  active: 'bg-coral-dim text-coral-ink',
  pending: 'bg-tag-pending text-muted',
  final: 'bg-green-dim text-green-ink',
}

export default function Rotation({ legs }) {
  return (
    <div className="mb-[30px] px-1 pt-1">
      {legs.map((leg, i) => {
        const isLast = i === legs.length - 1
        return (
          <div key={`${leg.iata}-${i}`} className="relative grid grid-cols-[60px_1fr] gap-4">
            <div className="relative flex flex-col items-center">
              <div
                className={`z-[2] h-4 w-4 shrink-0 rounded-full border-[3px] border-white ${NODE_STYLES[leg.status]}`}
              />
              {!isLast && (
                <div className={`min-h-[42px] w-[3px] flex-1 rounded-sm ${STEM_STYLES[leg.status]}`} />
              )}
            </div>

            <div className={isLast ? 'pb-[2px]' : 'pb-9'}>
              <div className="font-display text-[16px] font-bold">
                {leg.airport}{' '}
                <span className="ml-1.5 text-[13px] font-medium text-ink-dim">{leg.iata}</span>
              </div>
              <span
                className={`mt-1.5 inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold ${TAG_STYLES[leg.status]}`}
              >
                {leg.tag}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
