import { useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from './cx'

export type TabItem<T extends string> = { id: T; label: ReactNode; disabled?: boolean }

/**
 * Accessible tabs (WAI-ARIA): arrow keys, Home and End move between tabs; only the active tab is in the
 * tab order. The caller renders the panel with <TabPanel>.
 */
export function Tabs<T extends string>({ items, value, onChange, label, dark = false, className }: {
  items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string; dark?: boolean; className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const base = useId()
  const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter(i => i >= 0)
  function move(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex(item => item.id === value)
    const pos = enabled.indexOf(current)
    const next = event.key === 'ArrowRight' ? enabled[(pos + 1) % enabled.length]
      : event.key === 'ArrowLeft' ? enabled[(pos - 1 + enabled.length) % enabled.length]
      : event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : undefined
    if (next === undefined) return
    event.preventDefault(); onChange(items[next].id); refs.current[next]?.focus()
  }
  return <div role="tablist" aria-label={label} onKeyDown={move}
    className={cx('inline-flex gap-1 rounded-control p-1', dark ? 'bg-orbit' : 'bg-zero', className)}>
    {items.map((item, i) => {
      const selected = item.id === value
      return <button key={item.id} ref={el => { refs.current[i] = el }} type="button" role="tab" id={`${base}-${item.id}-tab`}
        aria-selected={selected} tabIndex={selected ? 0 : -1} disabled={item.disabled}
        onClick={() => onChange(item.id)}
        className={cx('focus-ring min-h-9 rounded-[4px] border-0 px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          selected ? (dark ? 'bg-night text-paper shadow-sm' : 'bg-white text-ink shadow-sm') : (dark ? 'bg-transparent text-paper/75 hover:text-paper' : 'bg-transparent text-muted hover:text-ink'))}>
        {item.label}
      </button>
    })}
  </div>
}

/** Panel for the active tab, named with the same label as the selected tab. */
export function TabPanel({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div role="tabpanel" aria-label={label} tabIndex={0} className={cx('focus-ring', className)}>{children}</div>
}
