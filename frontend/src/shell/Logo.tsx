import { Link } from 'react-router-dom'
import { cn } from '../ui'

/** Marca: un punto de brasa y el nombre en Plex Condensed. Lleva al inicio. */
export default function Logo({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return <Link to="/" onClick={onNavigate} aria-label="AllpaNina, go to home" className={cn('flex shrink-0 items-center gap-2.5 text-white no-underline', className)}>
    <span className="size-3.5 rounded-full bg-ember shadow-[0_0_0_4px_rgb(251_156_56/0.2)]" aria-hidden="true" />
    <span className="font-display text-xl font-semibold tracking-[0.01em]">AllpaNina</span>
  </Link>
}
