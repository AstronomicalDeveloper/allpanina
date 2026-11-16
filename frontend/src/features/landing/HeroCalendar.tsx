import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../shell/routes'
import { cn, fireStep, formatCount, formatMonth, formatMonthLong, monthInitial } from '../../ui'
import { FIRE_DARK } from '../../ui/fireScale'
import { seasonSummary, seriesBreaks } from '../calendar/calendarData'
import type { SeriesCell, SeriesYear } from '../calendar/calendarData'

/** Enlace al mes en el Calendario, con el mismo ámbito y la serie que muestra la portada. */
function monthHref(region: string, cell: SeriesCell) {
  return `${ROUTES.calendar}?${new URLSearchParams({ mapRegion: region, periodYear: String(cell.year), periodMonth: String(cell.month), calendarSeries: 'MODIS' })}`
}

function describe(cell: SeriesCell) {
  return cell.state === 'value' ? `${formatCount(cell.value)} cell-days` : cell.state === 'zero' ? '0 cell-days' : cell.state === 'missing' ? 'no usable data' : 'not published'
}

/**
 * Calendario de 14 años de la portada (A1, A4): escala oscura e invertida, lo intenso brilla.
 * Cada celda abre ese mes en el Calendario; al pasar el cursor o enfocar, muestra el mes y su valor.
 */
export default function HeroCalendar({ years, region, regionLabel }: { years: SeriesYear[]; region: string; regionLabel: string }) {
  const [hover, setHover] = useState<{ cell: SeriesCell; x: number; y: number } | null>(null)
  const breaks = seriesBreaks(years)
  const summary = seasonSummary(years)
  const cells = years.flatMap(row => row.cells)
  const first = cells.find(c => c.state !== 'absent'), last = [...cells].reverse().find(c => c.state !== 'absent')
  const col = hover ? hover.cell.month - 1 : 0
  const shift = col <= 1 ? '-15%' : col >= 10 ? '-85%' : '-50%'

  return <figure className="m-0 flex flex-col gap-3" aria-labelledby="hero-calendar-caption">
    {summary && <div className="relative ml-11 h-7 sm:ml-12" aria-hidden="true">
      <div className="absolute bottom-1 border-t-2 border-ember" style={{ left: `${(summary.peakMonths[0] - 1) / 12 * 100}%`, width: `${3 / 12 * 100}%` }}>
        <span className="absolute -top-6 left-0 whitespace-nowrap text-xs text-white">Months with the most detections</span>
      </div>
    </div>}
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="grid grid-cols-[2.75rem_repeat(12,minmax(0,1fr))] gap-[2px] sm:grid-cols-[3rem_repeat(12,minmax(0,1fr))] sm:gap-[3px]" role="presentation">
        <span />
        {Array.from({ length: 12 }, (_, i) => <span key={i} className="text-center font-display text-xs text-mist" aria-hidden="true">{monthInitial(i + 1)}</span>)}
      </div>
      <ol className="m-0 flex list-none flex-col gap-[2px] p-0 sm:gap-[3px]" aria-label={`${regionLabel}, MODIS cell-days by month`}>
        {years.map(row => <li key={row.year} className="grid grid-cols-[2.75rem_repeat(12,minmax(0,1fr))] items-center gap-[2px] sm:grid-cols-[3rem_repeat(12,minmax(0,1fr))] sm:gap-[3px]">
          <span className="font-display text-xs tabular-nums text-mist">{row.year}</span>
          {row.cells.map(cell => {
            const step = cell.state === 'value' ? fireStep(cell.value!, breaks) : 0
            const label = `${formatMonthLong(cell.year, cell.month)}: ${describe(cell)}. Open in the calendar`
            const show = (event: { currentTarget: HTMLElement }) => { const el = event.currentTarget; setHover({ cell, x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop }) }
            return <Link key={cell.month} to={monthHref(region, cell)} aria-label={label} onMouseEnter={show} onFocus={show} onBlur={() => setHover(null)}
              style={{ ...(cell.state === 'value' ? { background: FIRE_DARK[step] } : {}), ['--m' as string]: cell.month - 1 }}
              className={cn('hero-cell block h-5 rounded-cell sm:h-6',
                cell.state === 'zero' && 'bg-zero-dark',
                cell.state === 'missing' && 'bg-hatch-dark border border-rule',
                cell.state === 'absent' && 'border border-dashed border-rule',
                hover?.cell.year === cell.year && hover.cell.month === cell.month && 'outline-2 outline-offset-1 outline-white [outline-style:solid]')} />
          })}
        </li>)}
      </ol>
      {hover && <div aria-hidden="true" className="pointer-events-none absolute z-10 whitespace-nowrap rounded-control bg-white px-2.5 py-1.5 text-sm font-medium text-ink shadow-float"
        style={{ left: hover.x, top: hover.y - 6, transform: `translate(${shift}, -100%)` }}>
        {formatMonth(hover.cell.year, hover.cell.month)} · {describe(hover.cell)}
      </div>}
    </div>
    <figcaption id="hero-calendar-caption" className="flex flex-col gap-3 text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
      <span>{regionLabel} · MODIS · cell-days with detections per month{first && last ? `, ${formatMonth(first.year, first.month)} to ${formatMonth(last.year, last.month)}` : ''}</span>
      <span className="flex items-center gap-2" aria-hidden="true">fewer
        <span className="flex gap-[2px]">{FIRE_DARK.map((c, i) => <span key={i} className="h-2.5 w-4 rounded-[2px]" style={{ background: c }} />)}</span>more
      </span>
    </figcaption>
  </figure>
}
