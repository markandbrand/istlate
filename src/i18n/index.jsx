import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import es from './es.js'
import en from './en.js'
import { FORMATTERS } from './format.js'
import { FIXTURES as FIXTURES_ES, DEMO_CODE as DEMO_ES } from '../data/fixtures.es.js'
import { FIXTURES as FIXTURES_EN, DEMO_CODE as DEMO_EN } from '../data/fixtures.en.js'

export const LOCALES = { es, en }
const FIXTURES_BY_LOCALE = { es: FIXTURES_ES, en: FIXTURES_EN }
const DEMO_BY_LOCALE = { es: DEMO_ES, en: DEMO_EN }
const STORAGE_KEY = 'isitlate:locale'

/** Idioma inicial: el que se eligió antes, si no el del navegador, si no español. */
function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES[saved]) return saved
  } catch {
    // Navegación privada o almacenamiento bloqueado: seguimos con el del navegador.
  }
  const preferred = typeof navigator !== 'undefined' ? navigator.language : ''
  return preferred.toLowerCase().startsWith('en') ? 'en' : 'es'
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(detectLocale)

  useEffect(() => {
    document.documentElement.lang = LOCALES[locale].htmlLang
    document.title = LOCALES[locale].documentTitle
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Que no se pueda recordar la elección no debe romper la página.
    }
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      copy: LOCALES[locale],
      t: LOCALES[locale].ui,
      fmt: FORMATTERS[locale],
      fixtures: FIXTURES_BY_LOCALE[locale],
      demoCode: DEMO_BY_LOCALE[locale],
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n necesita estar dentro de <I18nProvider>')
  return ctx
}
