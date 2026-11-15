import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cx } from './cx'

const control = 'focus-ring w-full min-h-11 rounded-control border border-ink/25 bg-white px-3 text-base text-ink disabled:cursor-not-allowed disabled:bg-zero disabled:text-muted aria-[invalid=true]:border-cinder'
const controlDark = 'focus-ring w-full min-h-11 rounded-control border border-rule bg-orbit px-3 text-base text-paper disabled:cursor-not-allowed disabled:opacity-60'

type FieldShell = { label: ReactNode; hint?: ReactNode; error?: ReactNode; dark?: boolean; className?: string }

function Shell({ id, label, hint, error, dark, className, children }: FieldShell & { id: string; children: ReactNode }) {
  return <div className={cx('grid gap-1.5', className)}>
    <label htmlFor={id} className={cx('text-sm font-medium', dark ? 'text-paper' : 'text-ink')}>{label}</label>
    {children}
    {error ? <p id={`${id}-error`} className="m-0 text-xs font-medium text-cinder">{error}</p>
      : hint ? <p id={`${id}-hint`} className={cx('m-0 text-xs', dark ? 'text-paper/70' : 'text-muted')}>{hint}</p> : null}
  </div>
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldShell
export function Select({ label, hint, error, dark, className, id, children, ...props }: SelectProps) {
  const auto = useId(), fieldId = id ?? auto
  return <Shell id={fieldId} label={label} hint={hint} error={error} dark={dark} className={className}>
    <select id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} className={dark ? controlDark : control} {...props}>{children}</select>
  </Shell>
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldShell
export function TextInput({ label, hint, error, dark, className, id, ...props }: InputProps) {
  const auto = useId(), fieldId = id ?? auto
  return <Shell id={fieldId} label={label} hint={hint} error={error} dark={dark} className={className}>
    <input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} className={dark ? controlDark : control} {...props} />
  </Shell>
}
