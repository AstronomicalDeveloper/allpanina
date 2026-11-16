import { Link } from 'react-router-dom'
import { cn } from '../ui'

/** Marca del proyecto y nombre en Plex Condensed. Lleva al inicio. */
export default function Logo({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return <Link to="/" onClick={onNavigate} aria-label="AllpaNina, go to home" className={cn('flex shrink-0 items-center gap-2.5 text-white no-underline', className)}>
    <img src="/logo.png" alt="" width={794} height={865} className="h-10 w-auto shrink-0 object-contain" />
    <span className="font-display text-xl font-semibold tracking-[0.01em]">AllpaNina</span>
  </Link>
}
