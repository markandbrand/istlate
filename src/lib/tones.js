/**
 * Cada veredicto tiene un tono, y cada tono viste la insignia y el cartel.
 *
 * Las clases van escritas enteras y estáticas a propósito: Tailwind analiza
 * el código fuente en busca de literales, así que una clase construida por
 * concatenación no llegaría al CSS final.
 *
 * En la paleta nocturna los degradados van del tinte oscuro al color de la
 * tarjeta, no al blanco: sobre fondo oscuro, un degradado hacia blanco
 * reventaría el contraste del texto.
 */
export const TONES = {
  green: {
    card: 'border-green-line bg-green-dim',
    cardValue: 'text-green-ink',
    badge: 'bg-green-dim text-green-ink',
    dot: 'bg-green',
    banner: 'border-green-line bg-[linear-gradient(135deg,var(--color-green-dim),var(--color-card))]',
  },
  amber: {
    card: 'border-amber-line bg-amber-dim',
    cardValue: 'text-amber-ink',
    badge: 'bg-amber-dim text-amber-ink',
    dot: 'bg-amber',
    banner: 'border-amber-line bg-[linear-gradient(135deg,var(--color-amber-dim),var(--color-card))]',
  },
  coral: {
    card: 'border-coral-line bg-coral-dim',
    cardValue: 'text-coral-ink',
    badge: 'bg-coral-dim text-coral-ink',
    dot: 'bg-coral',
    banner: 'border-coral-line bg-[linear-gradient(135deg,var(--color-coral-dim),var(--color-card))]',
  },
  alert: {
    card: 'border-alert-line bg-alert-dim',
    cardValue: 'text-alert-ink',
    badge: 'bg-alert-dim text-alert-ink',
    dot: 'bg-alert',
    banner: 'border-alert-line bg-[linear-gradient(135deg,var(--color-alert-dim),var(--color-card))]',
  },
  blue: {
    card: 'border-olo-line bg-olo-dim',
    cardValue: 'text-olo-ink',
    badge: 'bg-olo-dim text-olo-ink',
    dot: 'bg-olo',
    banner: 'border-olo-line bg-[linear-gradient(135deg,var(--color-olo-dim),var(--color-card))]',
  },
  slate: {
    card: 'border-slate-line bg-slate-dim',
    cardValue: 'text-slate-ink',
    badge: 'bg-slate-dim text-slate-ink',
    dot: 'bg-slate',
    banner: 'border-slate-line bg-[linear-gradient(135deg,var(--color-slate-dim),var(--color-card))]',
  },
}
