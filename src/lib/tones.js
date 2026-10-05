/**
 * Cada veredicto tiene un tono, y cada tono viste la insignia y el cartel.
 *
 * Las clases van escritas enteras y estáticas a propósito: Tailwind analiza
 * el código fuente en busca de literales, así que una clase construida por
 * concatenación no llegaría al CSS final.
 */
export const TONES = {
  green: {
    card: 'border-[#bfe9d6] bg-green-dim',
    cardValue: 'text-green-ink',
    badge: 'bg-green-dim text-green-ink',
    dot: 'bg-green',
    banner: 'border-[#bfe9d6] bg-[linear-gradient(135deg,var(--color-green-dim),#fff)]',
  },
  amber: {
    card: 'border-amber-line bg-amber-dim',
    cardValue: 'text-amber-ink',
    badge: 'bg-amber-dim text-amber-ink',
    dot: 'bg-amber',
    banner: 'border-amber-line bg-[linear-gradient(135deg,var(--color-amber-dim),#fff)]',
  },
  coral: {
    card: 'border-coral-line bg-coral-dim',
    cardValue: 'text-coral-ink',
    badge: 'bg-coral-dim text-coral-ink',
    dot: 'bg-coral',
    banner: 'border-coral-line bg-[linear-gradient(135deg,var(--color-coral-dim),#fff)]',
  },
  alert: {
    card: 'border-alert-line bg-alert-dim',
    cardValue: 'text-alert-ink',
    badge: 'bg-alert-dim text-alert-ink',
    dot: 'bg-alert',
    banner: 'border-alert-line bg-[linear-gradient(135deg,var(--color-alert-dim),#fff)]',
  },
  blue: {
    card: 'border-[#c9e3f7] bg-blue-dim',
    cardValue: 'text-blue',
    badge: 'bg-blue-dim text-blue',
    dot: 'bg-blue',
    banner: 'border-[#c9e3f7] bg-[linear-gradient(135deg,var(--color-blue-dim),#fff)]',
  },
  slate: {
    card: 'border-slate-line bg-slate-dim',
    cardValue: 'text-slate-ink',
    badge: 'bg-slate-dim text-slate-ink',
    dot: 'bg-slate',
    banner: 'border-slate-line bg-[linear-gradient(135deg,var(--color-slate-dim),#fff)]',
  },
}
