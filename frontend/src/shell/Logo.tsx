import { Link } from 'react-router-dom'
import { cn } from '../ui'

/** Marca: fuego y nombre en Plex Condensed. Lleva al inicio. */
export default function Logo({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return <Link to="/" onClick={onNavigate} aria-label="AllpaNina, go to home" className={cn('flex shrink-0 items-center gap-2.5 text-white no-underline', className)}>
    <svg className="size-6 shrink-0 text-ember" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.4 2.2c.5 4.1-2.4 5.3-2.4 8.2-1.4-.8-2.1-2-2-3.7C5.5 9.3 4 12.1 4 15a8 8 0 0 0 16 0c0-4.5-2.7-9.1-6.6-12.8Z" />
      <path d="M12.7 12c.1 2-1.7 2.8-1.7 4.4-.6-.4-1-1-1.1-1.7A4.1 4.1 0 0 0 8 18a4 4 0 0 0 8 0c0-2.2-1.3-4.5-3.3-6Z" fill="var(--color-night)" />
    </svg>
    <span className="font-display text-xl font-semibold tracking-[0.01em]">AllpaNina</span>
  </Link>
}
