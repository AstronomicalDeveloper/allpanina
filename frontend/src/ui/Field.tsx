import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from './cn'

export type Surface = 'light' | 'dark'

const control = (surface: Surface) => cn(
  'w-full min-h-11 rounded-control border px-3 font-sans text-base',
  surface === 'light' ? 'border-hairline bg-white text-ink' : 'border-rule bg-orbit text-white',
  'disabled:opacity-60',
)

/** Etiqueta, control, ayuda y error, enlazados por id para lectores de pantalla. */
export function Field({ label, hint, error, children, surface = 'light', className }: {
  label: ReactNode; hint?: ReactNode; error?: ReactNode; surface?: Surface; className?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}) {
  const id = useId(), hintId = `${id}-hint`, errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  return <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={id} className={cn('text-sm font-medium', surface === 'light' ? 'text-ink' : 'text-white')}>{label}</label>
    {children({ id, describedBy, invalid: Boolean(error) })}
    {hint && <p id={hintId} className={cn('m-0 text-xs', surface === 'light' ? 'text-muted' : 'text-mist')}>{hint}</p>}
    {error && <p id={errorId} className="m-0 text-xs font-medium text-cinder">{error}</p>}
  </div>
}

/** Select nativo con flecha propia: accesible y sin librerías. */
export function Select({ surface = 'light', className, children, ...props }: { surface?: Surface } & SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="relative">
    <select className={cn(control(surface), 'appearance-none pr-9', className)} {...props}>{children}</select>
    <svg className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-70" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
  </div>
}

export function TextInput({ surface = 'light', className, ...props }: { surface?: Surface } & InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control(surface), className)} {...props} />
}
