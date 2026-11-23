/**
 * Direcciones por vuelo.
 *
 * Hasta ahora toda la web vivía en `/`, así que compartir el enlace no servía
 * de nada: quien lo recibía veía la portada vacía, no el vuelo. Por eso hubo
 * que mandar capturas de pantalla.
 *
 * Con esto, cada vuelo tiene su dirección y al abrirla se busca solo. Es
 * además el cimiento de dos cosas más: la vista previa al compartir (que ya
 * está hecha y no se usaba) y las páginas por vuelo para Google.
 *
 * Una ruta por idioma, igual que la política de privacidad.
 */

/** El mismo formato que valida el backend, para no aceptar basura en la URL. */
const CODIGO = /^[A-Z0-9]{2,3}\d{1,4}$/

/** Prefijo de la ruta en cada idioma. */
const PREFIJOS = { es: '/vuelo/', en: '/flight/' }

/**
 * El código de vuelo que lleva una ruta, si lleva alguno.
 * Acepta cualquiera de los idiomas: un enlace en español abierto por alguien
 * con el navegador en inglés tiene que funcionar igual.
 */
export function codigoDeLaRuta(pathname = '') {
  for (const prefijo of Object.values(PREFIJOS)) {
    if (!pathname.startsWith(prefijo)) continue
    const crudo = decodeURIComponent(pathname.slice(prefijo.length))
      .replace(/\/+$/, '')
      .trim()
      .toUpperCase()
    return CODIGO.test(crudo) ? crudo : null
  }
  return null
}

/** El idioma al que pertenece una ruta de vuelo, para respetar el del enlace. */
export function idiomaDeLaRuta(pathname = '') {
  for (const [idioma, prefijo] of Object.entries(PREFIJOS)) {
    if (pathname.startsWith(prefijo)) return idioma
  }
  return null
}

/** La dirección de un vuelo, conservando lo que haya en la query (?demo=1). */
export function rutaDeVuelo(code, locale = 'es', search = '') {
  // El proveedor devuelve el número con espacio ("TK 1314") y una ruta no lo
  // admite. Sin esta limpieza, compartir no funcionaría con datos reales,
  // solo con los de ejemplo.
  const limpio = (code ?? '').replace(/\s+/g, '').toUpperCase()
  if (!CODIGO.test(limpio)) return null
  return `${PREFIJOS[locale] ?? PREFIJOS.es}${limpio}${search ?? ''}`
}
