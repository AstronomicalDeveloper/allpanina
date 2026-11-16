import { Link } from 'react-router-dom'
import { cn } from '../ui'

/** Marca: un punto de brasa y el nombre en Plex Condensed. Lleva al inicio. */
export default function Logo({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return <Link to="/" onClick={onNavigate} aria-label="AllpaNina, go to home" className={cn('flex shrink-0 items-center gap-2.5 text-white no-underline', className)}>
    <img src="/logo.jpeg" alt="AllpaNina" className="block h-auto w-32 object-contain sm:w-40" />
  </Link>
}
