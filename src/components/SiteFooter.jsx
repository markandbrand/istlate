import { useI18n } from '../i18n/index.jsx'

export default function SiteFooter() {
  const { t } = useI18n()
  return (
    <footer className="pt-11 pb-[60px] text-center text-[12.5px] text-ink-dim">
      {t.footer}
    </footer>
  )
}
