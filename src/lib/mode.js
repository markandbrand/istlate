/**
 * Modo demo frente a modo producción.
 *
 * El selector de escenarios y el distintivo de "datos de ejemplo" son
 * herramientas de desarrollo: enseñan cancelaciones y desvíos que no se pueden
 * provocar a voluntad. En la web pública sobran y restan credibilidad.
 *
 * Se mantienen en tres casos: en desarrollo, cuando la respuesta del backend
 * viene marcada como demo (no hay key configurada), y cuando la URL lleva
 * `?demo=1`, que es lo que permite enseñar los once estados a alguien sin
 * tocar el código ni esperar a que un vuelo real se cancele.
 */
export function isDemoRequested() {
  if (import.meta.env.DEV) return true
  try {
    return new URLSearchParams(window.location.search).has('demo')
  } catch {
    // Entornos sin `location` accesible: producción por defecto.
    return false
  }
}
