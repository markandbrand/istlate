import { useEffect, useRef, useState } from 'react'
import Sky from './components/Sky.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import Hero from './components/Hero.jsx'
import FlightResult from './components/FlightResult.jsx'
import Waitlist from './components/Waitlist.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import { DEMO_CODE, lookupFlight } from './data/demoFlight.js'

export default function App() {
  const [query, setQuery] = useState('')
  const [flight, setFlight] = useState(null)
  // Cambia en cada búsqueda para remontar el resultado y repetir la animación.
  const [searchId, setSearchId] = useState(0)
  const resultRef = useRef(null)

  function search(code = query) {
    setFlight(lookupFlight(code))
    setSearchId((n) => n + 1)
  }

  function useDemo() {
    setQuery(DEMO_CODE)
    search(DEMO_CODE)
  }

  useEffect(() => {
    if (searchId > 0) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchId])

  return (
    <>
      <Sky />

      <div className="relative z-[2] mx-auto max-w-[900px] px-6">
        <SiteHeader />

        <Hero
          value={query}
          onChange={setQuery}
          onSearch={() => search()}
          onUseDemo={useDemo}
        />

        {flight && (
          <section key={searchId} ref={resultRef} className="animate-rise pt-[10px] pb-[60px]">
            <FlightResult flight={flight} />
            <Waitlist />
          </section>
        )}

        <SiteFooter />
      </div>
    </>
  )
}
