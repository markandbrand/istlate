import { useState } from 'react'

export default function Waitlist() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
    // TODO: conectar a Google Form / almacenamiento real cuando lo tengamos
  }

  return (
    <div className="mx-auto mt-[34px] max-w-[520px] rounded-[20px] bg-card px-7 py-[26px] text-center shadow-soft">
      <h3 className="mt-0 mb-1.5 font-display text-[20px] font-bold">
        ¿Te gustaría tenerlo para tu próximo vuelo?
      </h3>
      <p className="mt-0 mb-[18px] text-[14px] leading-[1.5] text-ink-dim">
        Esto es solo una demo con datos de ejemplo. Si te avisamos cuando esté listo con datos
        reales, deja tu email.
      </p>

      {sent ? (
        <p className="text-[14px] font-semibold text-green-ink">¡Gracias! Te avisaremos 🎉</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap justify-center gap-2">
          <label className="sr-only" htmlFor="waitEmail">
            Tu email
          </label>
          <input
            id="waitEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="min-w-[200px] flex-1 rounded-[11px] border-2 border-line px-[14px] py-[11px] font-sans text-[14px] placeholder:text-muted"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-[11px] border-none bg-blue px-5 font-display text-[14px] font-semibold text-white hover:bg-blue-hover"
          >
            Avísame
          </button>
        </form>
      )}
    </div>
  )
}
