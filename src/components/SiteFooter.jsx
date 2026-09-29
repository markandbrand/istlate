import { useI18n } from '../i18n/index.jsx'
import { isDemoRequested } from '../lib/mode.js'

/**
 * Pie de página.
 *
 * En la demo anuncia que los datos son de ejemplo, que es lo honesto mientras
 * lo sean. En producción esa frase sería mentira, así que deja paso a lo que
 * sí toca: de dónde salen los datos y el enlace a la política de privacidad,
 * que además conviene tener accesible desde cualquier página.
 */
export default function SiteFooter() {
  const { t, locale } = useI18n()
  const demo = isDemoRequested()

  if (demo) {
    return (
      <footer className="pt-11 pb-[60px] text-center text-[12.5px] text-ink-dim">
        {t.footer}
      </footer>
    )
  }

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 pt-11 pb-[60px] text-center text-[12.5px] text-ink-dim">
      <span>{t.footerLive}</span>
      <span aria-hidden="true">·</span>
      <a
        href={locale === 'en' ? '/privacy' : '/privacidad'}
        className="underline underline-offset-2 hover:text-blue"
      >
        {t.footerPrivacy}
      </a>
    </footer>
  )
}
