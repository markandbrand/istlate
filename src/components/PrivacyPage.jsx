import { useEffect } from 'react'
import { LEGAL, LEGAL_COMPLETO } from '../data/legal.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * Política de privacidad.
 *
 * Redactada sobre el RGPD y la LSSI, que es lo que aplica operando desde
 * España. NO sustituye a una revisión jurídica: cubre el caso concreto de esta
 * web (un formulario de email y nada más) y habrá que ampliarla en cuanto
 * aparezcan pagos, cuentas de usuario o analítica.
 *
 * La URL manda sobre el idioma: quien abre /privacy espera leerla en inglés
 * aunque su navegador esté en español, porque es el enlace que alguien le ha
 * pasado. Se fija una sola vez, de modo que si luego cambia de idioma con el
 * interruptor, se respeta.
 */
export default function PrivacyPage({ forceLocale }) {
  const { copy, locale, setLocale } = useI18n()
  const p = copy.privacy

  useEffect(() => {
    if (forceLocale && forceLocale !== locale) setLocale(forceLocale)
    // Solo al entrar: sin `locale` en las dependencias, el interruptor sigue
    // mandando si la persona decide cambiarlo después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceLocale])

  return (
    <div className="mx-auto max-w-[720px] pt-[26px] pb-[80px]">
      <a
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-display text-[21px] font-bold text-blue"
      >
        ← IsItLate?
      </a>

      <div className="rounded-card bg-card p-7 shadow-soft md:p-10">
        <h1 className="mt-0 mb-2 font-display text-[30px] leading-[1.15] font-bold">{p.title}</h1>
        <p className="mt-0 mb-8 text-[13px] text-ink-dim">
          {p.updated} {LEGAL.actualizado}
        </p>

        {!LEGAL_COMPLETO && (
          <div className="mb-8 rounded-2xl border-2 border-alert-line bg-alert-dim px-5 py-4">
            <b className="mb-1 block font-display text-[15px] text-alert-ink">{p.draftTitle}</b>
            <span className="text-[13.5px] leading-[1.55] text-ink-dim">{p.draftBody}</span>
          </div>
        )}

        {p.sections.map((section) => (
          <section key={section.h} className="mb-7">
            <h2 className="mt-0 mb-2.5 font-display text-[17px] font-bold">{section.h}</h2>
            {section.body.map((para, i) => (
              <p key={i} className="mt-0 mb-3 text-[14.5px] leading-[1.6] text-ink-dim">
                {para}
              </p>
            ))}
            {section.list && (
              <ul className="mt-0 mb-3 list-disc pl-5 text-[14.5px] leading-[1.6] text-ink-dim">
                {section.list.map((item) => (
                  <li key={item} className="mb-1.5">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
