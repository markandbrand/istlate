import PlaneIcon from './PlaneIcon.jsx'
import LanguageToggle from './LanguageToggle.jsx'

export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between pt-[26px]">
      <div className="flex items-center gap-2 font-display text-[21px] font-bold text-blue">
        <PlaneIcon />
        IsItLate?
      </div>
      <LanguageToggle />
    </header>
  )
}
