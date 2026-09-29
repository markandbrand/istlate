/**
 * Datos del responsable del tratamiento.
 *
 * El RGPD obliga a identificar a quien recoge los datos: nombre o razón
 * social, NIF, domicilio y una vía de contacto. Mientras estos campos estén
 * vacíos, la página de privacidad muestra un aviso bien visible en lugar de
 * publicarse incompleta, porque una política a medias es peor que ninguna:
 * da apariencia de cumplimiento sin cumplir.
 *
 * COMPLETAR ANTES DE PUBLICAR.
 */
export const LEGAL = {
  /** Nombre y apellidos, o razón social. */
  titular: '',
  /** NIF o CIF. */
  nif: '',
  /** Domicilio fiscal. */
  direccion: '',
  /** Email de contacto para ejercer derechos. */
  email: '',
  /** Proveedor de email marketing, cuando se contrate (p. ej. "Brevo, Francia"). */
  proveedorEmail: '',
  /** Última revisión del texto. */
  actualizado: '2026-09-29',
}

export const LEGAL_COMPLETO = Boolean(
  LEGAL.titular && LEGAL.nif && LEGAL.direccion && LEGAL.email,
)
