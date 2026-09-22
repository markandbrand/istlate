import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'

/**
 * Captación de emails para el lanzamiento.
 *
 * Los dos consentimientos van SEPARADOS a propósito, y no es un capricho
 * legal: enviar el formulario consiente que te avisemos del lanzamiento, que
 * es lo que la persona ha venido a pedir. La casilla, opcional y desmarcada,
 * consiente lo demás (consejos, recomendaciones, futuras ofertas).
 *
 * Mezclarlos dejaría la lista inservible para cualquier uso comercial
 * posterior, porque el RGPD exige que el consentimiento sea específico para
 * cada finalidad. Separarlo hoy cuesta diez líneas; rehacerlo con la lista ya
 * montada significa volver a pedir permiso uno por uno.
 */
export default function Waitlist() {
  const { t, locale } = useI18n()
  const [email, setEmail] = useState('')
  const [acceptsMarketing, setAcceptsMarketing] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: enviar a /api/subscribe con { email, acceptsMarketing, locale,
    // consentedAt, source }. Hasta que haya proveedor de email conectado esto
    // NO guarda nada: el dato se pierde.
    console.info('[isitlate] alta pendiente de conectar:', { email, acceptsMarketing, locale })
    setSent(true)
  }

  return (
    <div className="mx-auto mt-[34px] max-w-[520px] rounded-[20px] bg-card px-7 py-[26px] text-center shadow-soft">
      <h3 className="mt-0 mb-1.5 font-display text-[20px] font-bold">{t.waitlistTitle}</h3>
      <p className="mt-0 mb-[18px] text-[14px] leading-[1.5] text-ink-dim">{t.waitlistText}</p>

      {sent ? (
        <p className="text-[14px] font-semibold text-green-ink">{t.waitlistThanks}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="sr-only" htmlFor="waitEmail">
              {t.waitlistEmailLabel}
            </label>
            <input
              id="waitEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.waitlistPlaceholder}
              className="min-w-[200px] flex-1 rounded-[11px] border-2 border-line px-[14px] py-[11px] font-sans text-[14px] placeholder:text-muted"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-[11px] border-none bg-blue px-5 font-display text-[14px] font-semibold text-white hover:bg-blue-hover"
            >
              {t.waitlistButton}
            </button>
          </div>

          <p className="mt-3 mb-0 text-[12.5px] text-ink-dim">{t.waitlistPurpose}</p>

          <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-left text-[12.5px] leading-[1.45] text-ink-dim">
            <input
              type="checkbox"
              checked={acceptsMarketing}
              onChange={(e) => setAcceptsMarketing(e.target.checked)}
              className="mt-0.5 h-[15px] w-[15px] shrink-0 cursor-pointer accent-blue"
            />
            <span>{t.waitlistMarketing}</span>
          </label>

          <p className="mt-2.5 mb-0 text-[11.5px] leading-[1.45] text-muted">
            {t.waitlistLegalBefore}
            <a href="/privacidad" className="text-ink-dim underline underline-offset-2">
              {t.waitlistLegalLink}
            </a>
            {t.waitlistLegalAfter}
          </p>
        </form>
      )}
    </div>
  )
}
