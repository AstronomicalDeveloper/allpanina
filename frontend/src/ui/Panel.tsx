import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'
import type { Surface } from './Field'

/** Superficie de contenido. `floating` solo para lo que flota sobre el mapa (lleva sombra). */
export function Panel({ surface = 'light', floating = false, className, ...props }: { surface?: Surface; floating?: boolean } & HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-panel border p-5',
    surface === 'light' ? 'border-hairline bg-white text-ink' : 'border-rule bg-orbit text-white',
    floating && 'shadow-float', className)} {...props} />
}

/** Encabezado de página: título en Plex Condensed, bajada opcional y acciones a la derecha. */
export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return <header className={cn('flex flex-wrap items-end justify-between gap-x-8 gap-y-4', className)}>
    <div className="max-w-[60ch]">
      <h1 className="m-0 font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      {description && <p className="mb-0 mt-3 text-lg text-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </header>
}

/** Cifra destacada con su etiqueta. Cifras tabulares. */
export function Stat({ value, label, surface = 'light', className }: { value: ReactNode; label: ReactNode; surface?: Surface; className?: string }) {
  return <div className={cn('flex flex-col gap-1', className)}>
    <span className={cn('font-display text-3xl font-semibold tabular-nums', surface === 'light' ? 'text-ink' : 'text-white')}>{value}</span>
    <span className={cn('text-sm', surface === 'light' ? 'text-muted' : 'text-mist')}>{label}</span>
  </div>
}

/** Plegable nativo (details/summary): «Technical detail», ayudas, metodología extensa. */
export function Disclosure({ summary, children, surface = 'light', className, defaultOpen }: { summary: ReactNode; children: ReactNode; surface?: Surface; className?: string; defaultOpen?: boolean }) {
  return <details open={defaultOpen} className={cn('group rounded-control border', surface === 'light' ? 'border-hairline bg-white' : 'border-rule bg-orbit', className)}>
    <summary className={cn('flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden', surface === 'light' ? 'text-ink' : 'text-white')}>
      <svg className="size-4 shrink-0 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
      {summary}
    </summary>
    <div className={cn('px-4 pb-4 text-sm', surface === 'light' ? 'text-muted' : 'text-mist')}>{children}</div>
  </details>
}
