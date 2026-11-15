import type { ReactNode } from 'react'
import { cx } from './cx'

/** A labelled figure: "MODIS · 4,200 cell-days". Figures in Plex Condensed with tabular numerals. */
export function Stat({ label, value, unit, note, dark = false, className }: { label: ReactNode; value: ReactNode; unit?: ReactNode; note?: ReactNode; dark?: boolean; className?: string }) {
  return <div className={cx('grid gap-1', className)}>
    <span className={cx('text-xs font-medium uppercase tracking-[0.06em]', dark ? 'text-paper/70' : 'text-muted')}>{label}</span>
    <span className={cx('font-display text-2xl font-semibold tabular-nums', dark ? 'text-paper' : 'text-ink')}>
      {value}{unit && <span className={cx('ml-1 font-sans text-sm font-normal', dark ? 'text-paper/70' : 'text-muted')}>{unit}</span>}
    </span>
    {note && <span className={cx('text-xs', dark ? 'text-paper/70' : 'text-muted')}>{note}</span>}
  </div>
}
