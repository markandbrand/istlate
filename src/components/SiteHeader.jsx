import PlaneIcon from './PlaneIcon.jsx'

export default function SiteHeader() {
  return (
    <header className="pt-[26px]">
      <div className="flex items-center gap-2 font-display text-[21px] font-bold text-blue">
        <PlaneIcon />
        IsItLate?
      </div>
    </header>
  )
}
