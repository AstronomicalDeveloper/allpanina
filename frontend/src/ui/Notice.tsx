import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Aviso con ícono y texto (nunca solo color).
 * info: contexto · warning: precaución · error: algo falló (role=alert) · exploratory: resultado no validado (My region, DEMO).
 */
export type NoticeTone = 'info' | 'warning' | 'error' | 'exploratory'

const tones: Record<NoticeTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-hairline bg-white text-ink', icon: <path d="M8 7v4M8 4.5v.5" /> },
  warning: { box: 'border-fire-3 bg-fire-1 text-ink', icon: <path d="M8 5v3.5M8 10.5v.5" /> },
  error: { box: 'border-cinder bg-white text-ink', icon: <path d="m5.5 5.5 5 5m0-5-5 5" /> },
  exploratory: { box: 'border-dashed border-muted bg-white text-ink', icon: <path d="M4 8h8M8 4v8" /> },
}

export function Notice({ tone = 'info', title, children, action, className }: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { box, icon } = tones[tone]
  return <div role={tone === 'error' ? 'alert' : undefined} className={cn('flex gap-3 rounded-control border p-4 text-sm', box, className)}>
    <svg className={cn('mt-0.5 size-4 shrink-0', tone === 'error' ? 'text-cinder' : 'text-muted')} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" />{icon}</svg>
    <div className="flex min-w-0 flex-col gap-1">
      {title && <strong className="font-semibold">{title}</strong>}
      {children && <div className="text-muted [&_p]:m-0">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  </div>
}

/** Barra de progreso accesible (procesamiento de My region). `value` null = indeterminado. */
export function Progress({ label, value, detail, className }: { label: string; value: number | null; detail?: ReactNode; className?: string }) {
  const pct = value === null ? null : Math.max(0, Math.min(100, Math.round(value * 100)))
  return <div className={cn('flex flex-col gap-2', className)}>
    <div className="flex justify-between text-sm"><span className="font-medium text-ink">{label}</span>{pct !== null && <span className="tabular-nums text-muted">{pct}%</span>}</div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} className="h-2 overflow-hidden rounded-full bg-hairline">
      <div className={cn('h-full rounded-full bg-ember', pct === null && 'w-1/3 animate-pulse')} style={pct === null ? undefined : { width: `${pct}%` }} />
    </div>
    {detail && <p className="m-0 text-xs text-muted">{detail}</p>}
  </div>
}

/** Indicador de pasos para flujos (My region: Country → Region → Data → Processing → Results). */
export function Steps({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return <ol className={cn('m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0', className)}>
    {steps.map((step, i) => {
      const state = i < current ? 'done' : i === current ? 'current' : 'todo'
      return <li key={step} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2 text-sm">
        <span className={cn('grid size-7 place-items-center rounded-full font-display text-sm font-semibold tabular-nums',
          state === 'done' && 'bg-ink text-white', state === 'current' && 'bg-ember text-ink', state === 'todo' && 'border border-hairline bg-white text-muted')}>
          {state === 'done' ? <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg> : i + 1}
        </span>
        <span className={cn(state === 'todo' ? 'text-muted' : 'font-medium text-ink')}>{step}{state === 'done' && <span className="sr-only"> (completed)</span>}</span>
      </li>
    })}
  </ol>
}
