import { useEffect, useRef, useState } from 'react'
import Sky from './components/Sky.jsx'
import SiteHeader from './components/SiteHeader.jsx'
import Hero from './components/Hero.jsx'
import FlightResult from './components/FlightResult.jsx'
import { LoadingCard, ErrorCard } from './components/StatusCard.jsx'
import ScenarioSwitcher from './components/ScenarioSwitcher.jsx'
import Waitlist from './components/Waitlist.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import { lookupFlight } from './data/flightApi.js'
import { useI18n } from './i18n/index.jsx'

export default function App() {
  const { locale, fixtures, demoCode } = useI18n()
  const [query, setQuery] = useState('')
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scenario, setScenario] = useState(null)
  // Asumimos modo demo hasta que el backend devuelva datos reales.
  const [isDemo, setIsDemo] = useState(true)
  // Cambia en cada búsqueda para remontar el resultado y repetir la animación.
  const [searchId, setSearchId] = useState(0)
  const resultRef = useRef(null)
  // Descarta respuestas de búsquedas que el usuario ya ha dejado atrás.
  const lastSearch = useRef(0)

  // Al cambiar de idioma cambian también los escenarios, así que se recarga
  // el equivalente en el idioma nuevo en vez de dejar un vuelo del anterior.
  useEffect(() => {
    if (!scenario) return
    const picked = fixtures[scenario]
    if (!picked) return
    setFlight({ ...picked, demo: true })
    setQuery(picked.code)
  }, [locale, scenario, fixtures])

  async function search(code = query) {
    const id = ++lastSearch.current
    setLoading(true)
    setError(null)
    setFlight(null)
    setScenario(null)
    setSearchId((n) => n + 1)
    try {
      const result = await lookupFlight(code, { fixtures, demoCode })
      if (id !== lastSearch.current) return
      setFlight(result)
      setIsDemo(Boolean(result.demo))
      setScenario(Object.keys(fixtures).find((k) => fixtures[k].code === result.code) ?? null)
    } catch (err) {
      if (id !== lastSearch.current) return
      setError(err.message)
    } finally {
      if (id === lastSearch.current) setLoading(false)
    }
  }

  function useDemo() {
    setQuery(demoCode)
    search(demoCode)
  }

  function pickScenario(key) {
    lastSearch.current++
    const picked = fixtures[key]
    setLoading(false)
    setError(null)
    setScenario(key)
    setQuery(picked.code)
    setFlight({ ...picked, demo: true })
    setSearchId((n) => n + 1)
  }

  useEffect(() => {
    if (searchId > 0) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchId])

  const showing = loading || error || flight

  return (
    <>
      <Sky />

      <div className="relative z-[2] mx-auto max-w-[900px] px-6">
        <SiteHeader />

        <Hero value={query} onChange={setQuery} onSearch={() => search()} onUseDemo={useDemo} />

        {isDemo && <ScenarioSwitcher active={scenario} onPick={pickScenario} />}

        {showing && (
          <section ref={resultRef} className="pt-[10px] pb-[60px]">
            <div key={searchId} className="animate-rise">
              {loading && <LoadingCard />}
              {error && <ErrorCard message={error} onRetry={() => search()} />}
              {flight && !loading && !error && <FlightResult flight={flight} />}
            </div>

            {flight && !loading && !error && <Waitlist />}
          </section>
        )}

        <SiteFooter />
      </div>
    </>
  )
}
