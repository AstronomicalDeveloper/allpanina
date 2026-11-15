import type { ReactNode } from 'react'
import { cx } from './cx'

/** Folded "Technical detail" and similar: native <details>, keyboard accessible without JS. */
export function Disclosure({ summary, children, defaultOpen = false, className }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return <details open={defaultOpen} className={cx('group rounded-control border border-ink/10 bg-white', className)}>
    <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
      <span>{summary}</span>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 transition-transform group-open:rotate-180"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
    </summary>
    <div className="border-t border-ink/10 px-4 py-3 text-sm text-muted">{children}</div>
  </details>
}
