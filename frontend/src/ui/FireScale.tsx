import type { ReactNode } from 'react'
import { cx } from './cx'

import { FIRE_DARK, FIRE_LIGHT } from './fireColors'

/** Legend "less → more" with the 9 steps; optional integer ranges for each class. */
export function FireLegend({ dark = false, ranges, label = 'Cell-days per month', className }: { dark?: boolean; ranges?: string[]; label?: ReactNode; className?: string }) {
  const scale = dark ? FIRE_DARK : FIRE_LIGHT
  return <figure className={cx('m-0 grid gap-1.5', className)} aria-label={typeof label === 'string' ? `${label}: scale from less to more` : undefined}>
    <figcaption className={cx('text-xs', dark ? 'text-paper/75' : 'text-muted')}>{label}</figcaption>
    <div className="flex items-center gap-2">
      <span className={cx('text-xs', dark ? 'text-paper/75' : 'text-muted')}>less</span>
      <ol className="m-0 flex list-none gap-0.5 p-0">
        {scale.map((color, i) => <li key={color} className="grid justify-items-center gap-0.5">
          <span className="block h-3 w-6 rounded-cell" style={{ background: color }} title={ranges?.[i]} />
          {ranges && <span className={cx('text-[13px] leading-none tabular-nums', dark ? 'text-paper/70' : 'text-muted')}>{ranges[i]}</span>}
        </li>)}
      </ol>
      <span className={cx('text-xs', dark ? 'text-paper/75' : 'text-muted')}>more</span>
    </div>
  </figure>
}

export type DataState = 'zero' | 'missing' | 'unpublished'
const STATE_LABEL: Record<DataState, string> = { zero: 'Valid zero', missing: 'No data', unpublished: 'Not published' }

/** States that are not magnitude never rely on color alone: number, hatching or dotted border. */
export function StateSwatch({ state, dark = false }: { state: DataState; dark?: boolean }) {
  return <span className={cx('inline-flex items-center gap-1.5 text-xs', dark ? 'on-dark text-paper/80' : 'text-muted')}>
    <span aria-hidden="true" className={cx('inline-grid h-4 w-7 place-items-center rounded-cell text-[13px] leading-none', `state-${state}`)}>{state === 'zero' ? '0' : ''}</span>
    {STATE_LABEL[state]}
  </span>
}

export function StateLegend({ dark = false, className }: { dark?: boolean; className?: string }) {
  return <div className={cx('flex flex-wrap gap-x-4 gap-y-1', className)}>
    {(['zero', 'missing', 'unpublished'] as const).map(s => <StateSwatch key={s} state={s} dark={dark} />)}
  </div>
}
