import type { ReactNode } from 'react'
import { cx } from './cx'

type Tone = 'info' | 'warning' | 'error' | 'success'
const tones: Record<Tone, string> = {
  info: 'border-ink/15 bg-white text-ink',
  warning: 'border-fire-4 bg-fire-1 text-ink',
  error: 'border-cinder bg-[#FDECE6] text-ink',
  success: 'border-[#2E7D5B] bg-[#E8F4EE] text-ink',
}

/** Inline message. Errors use role="alert"; the rest role="status" so screen readers announce them politely. */
export function Notice({ tone = 'info', title, children, action, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cx('grid gap-1 rounded-control border-l-4 border px-4 py-3 text-sm', tones[tone], className)}>
    {title && <strong className="font-semibold">{title}</strong>}
    {children && <div>{children}</div>}
    {action && <div className="mt-1">{action}</div>}
  </div>
}
