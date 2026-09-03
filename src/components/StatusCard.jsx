/** Tarjeta de carga: el esqueleto respira mientras consultamos el vuelo. */
export function LoadingCard() {
  const bar = 'animate-pulse rounded-lg bg-line'
  return (
    <div className="rounded-card bg-card p-7 shadow-soft" aria-busy="true">
      <p className="sr-only">Buscando tu vuelo…</p>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className={`${bar} mb-3 h-3 w-[90px]`} />
          <div className={`${bar} h-6 w-[260px] max-w-full`} />
        </div>
        <div className={`${bar} h-8 w-[130px] rounded-full`} />
      </div>
      <div className={`${bar} mb-[26px] h-[86px] w-full rounded-2xl`} />
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4 border-t border-b border-line py-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className={`${bar} mb-2 h-2.5 w-[70px]`} />
            <div className={`${bar} h-4 w-[52px]`} />
          </div>
        ))}
      </div>
      <div className={`${bar} h-[70px] w-full rounded-[14px]`} />
    </div>
  )
}

/** Tarjeta de error: dice qué ha pasado y qué hacer, sin culpar al usuario. */
export function ErrorCard({ message, onRetry }) {
  return (
    <div className="rounded-card bg-card p-7 text-center shadow-soft">
      <div className="mb-3 text-[32px]">🧭</div>
      <b className="mb-2 block font-display text-[19px]">Nos hemos perdido</b>
      <p className="mx-auto mt-0 mb-5 max-w-[420px] text-[14px] leading-[1.55] text-ink-dim">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-[11px] border-none bg-blue px-5 py-3 font-display text-[14px] font-semibold text-white hover:bg-blue-hover"
      >
        Probar otra vez
      </button>
    </div>
  )
}
