const CLOUDS = [
  {
    className: 'w-[180px] top-[8%] left-[-4%] animate-[drift_60s_linear_infinite]',
    shapes: [
      { cx: 60, cy: 60, rx: 55, ry: 30 },
      { cx: 110, cy: 45, rx: 45, ry: 35 },
      { cx: 150, cy: 65, rx: 40, ry: 25 },
    ],
  },
  {
    className: 'w-[120px] top-[20%] right-[-2%] animate-[drift_44s_linear_infinite_reverse]',
    shapes: [
      { cx: 60, cy: 60, rx: 50, ry: 28 },
      { cx: 110, cy: 48, rx: 42, ry: 30 },
    ],
  },
  {
    className: 'w-[150px] top-[62%] left-[2%] animate-[drift_70s_linear_infinite]',
    shapes: [
      { cx: 60, cy: 60, rx: 55, ry: 30 },
      { cx: 120, cy: 50, rx: 46, ry: 32 },
    ],
  },
  {
    className: 'w-[110px] top-[78%] right-[6%] animate-[drift_50s_linear_infinite_reverse]',
    shapes: [
      { cx: 70, cy: 60, rx: 48, ry: 27 },
      { cx: 115, cy: 47, rx: 38, ry: 28 },
    ],
  },
]

export default function Sky() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <div key={i} className={`absolute opacity-90 ${cloud.className}`}>
          <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className="block h-full w-full">
            {cloud.shapes.map((s, j) => (
              <ellipse key={j} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="#fff" />
            ))}
          </svg>
        </div>
      ))}

      <div className="absolute top-[14%] left-[-60px] w-[70px] opacity-95 animate-[fly_26s_linear_infinite]">
        <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 40 L40 40"
            stroke="#c7defa"
            strokeWidth="3"
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
          <g transform="translate(38,26)">
            <path d="M0 8 L34 8 L28 2 L34 8 L28 14 L0 8 Z" fill="#2f7fd6" />
            <path d="M14 8 L6 -4 L11 -4 L20 6 Z" fill="#2f7fd6" />
            <path d="M14 10 L6 20 L11 20 L20 12 Z" fill="#2f7fd6" />
          </g>
        </svg>
      </div>
    </div>
  )
}
