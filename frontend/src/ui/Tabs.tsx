import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from './cn'
import type { Surface } from './Field'

export type Option<T extends string> = { value: T; label: ReactNode; disabled?: boolean }

/**
 * Pestañas accesibles (patrón ARIA tablist): flechas, Inicio y Fin mueven el foco y activan.
 * El contenido de cada panel lo pinta quien la usa, con id `${id}-panel-${value}`.
 */
export function Tabs<T extends string>({ id, label, options, value, onChange, surface = 'light', className }: {
  id: string; label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; surface?: Surface; className?: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const enabled = options.filter(option => !option.disabled)
  function onKeyDown(event: KeyboardEvent) {
    const index = enabled.findIndex(option => option.value === value)
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : null
    if (next === null) return
    event.preventDefault()
    const target = enabled[(next + enabled.length) % enabled.length]
    onChange(target.value)
    refs.current[options.indexOf(target)]?.focus()
  }
  return <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('flex gap-1 border-b', surface === 'light' ? 'border-hairline' : 'border-rule', className)}>
    {options.map((option, i) => {
      const selected = option.value === value
      return <button key={option.value} ref={el => { refs.current[i] = el }} role="tab" type="button" id={`${id}-tab-${option.value}`}
        aria-selected={selected} aria-controls={`${id}-panel-${option.value}`} tabIndex={selected ? 0 : -1} disabled={option.disabled}
        onClick={() => onChange(option.value)}
        className={cn('-mb-px min-h-11 cursor-pointer border-0 border-b-2 bg-transparent px-3 font-sans text-sm font-medium',
          selected ? 'border-ember' : 'border-transparent',
          surface === 'light' ? (selected ? 'text-ink' : 'text-muted hover:text-ink') : (selected ? 'text-white' : 'text-mist hover:text-white'),
          'disabled:cursor-not-allowed disabled:opacity-50')}>{option.label}</button>
    })}
  </div>
}

/** Conmutador de opciones excluyentes (sensor, período). Botones con aria-pressed. */
export function Segmented<T extends string>({ label, options, value, onChange, surface = 'light', className }: {
  label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; surface?: Surface; className?: string
}) {
  return <div role="group" aria-label={label} className={cn('inline-flex rounded-control p-0.5', surface === 'light' ? 'bg-hairline/70' : 'bg-orbit', className)}>
    {options.map(option => {
      const pressed = option.value === value
      return <button key={option.value} type="button" aria-pressed={pressed} disabled={option.disabled} onClick={() => onChange(option.value)}
        className={cn('min-h-9 cursor-pointer rounded-[5px] border-0 px-3 font-sans text-sm font-medium',
          pressed ? (surface === 'light' ? 'bg-white text-ink shadow-sm' : 'bg-night text-white') : (surface === 'light' ? 'bg-transparent text-muted hover:text-ink' : 'bg-transparent text-mist hover:text-white'),
          'disabled:cursor-not-allowed disabled:opacity-50')}>{option.label}</button>
    })}
  </div>
}
