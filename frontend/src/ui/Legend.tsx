import { cn } from './cn'
import { FIRE_DARK, FIRE_LIGHT, classLabels, fireStep } from './fireScale'
import type { FireSurface } from './fireScale'

/**
 * Leyenda de la escala de fuego. Con `breaks`, muestra un bloque por clase con su rango entero;
 * sin `breaks`, muestra la rampa continua con «Fewer» y «More».
 */
export function FireLegend({ breaks, surface = 'light', unit = 'cell-days', className }: { breaks?: number[]; surface?: FireSurface; unit?: string; className?: string }) {
  const ramp = surface === 'light' ? FIRE_LIGHT : FIRE_DARK
  const text = surface === 'light' ? 'text-muted' : 'text-mist'
  if (!breaks) return <div className={cn('flex items-center gap-2 text-xs', text, className)}>
    <span>Fewer</span>
    <span className="flex" aria-hidden="true">{ramp.map(c => <span key={c} className="h-2.5 w-5" style={{ background: c }} />)}</span>
    <span>More</span><span className="sr-only">{unit}</span>
  </div>
  const labels = classLabels(breaks)
  const steps = labels.map((_, i) => fireStep(i === 0 ? 1 : breaks[i - 1], breaks))
  return <figure className={cn('m-0 flex flex-col gap-1.5', className)}>
    <figcaption className={cn('text-xs', text)}>{unit}</figcaption>
    <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
      {labels.map((label, i) => <li key={i} className={cn('flex items-center gap-1.5 text-xs tabular-nums', text)}>
        <span className="size-3 rounded-[2px]" style={{ background: ramp[steps[i]] }} aria-hidden="true" />{label}
      </li>)}
    </ul>
  </figure>
}

/** Los tres estados que no son magnitud: siempre con forma distinta, no solo color. */
export function DataStateLegend({ surface = 'light', className }: { surface?: FireSurface; className?: string }) {
  const text = surface === 'light' ? 'text-muted' : 'text-mist'
  const item = 'flex items-center gap-1.5 text-xs'
  return <ul className={cn('m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0', text, className)}>
    <li className={item}><span className={cn('grid size-3 place-items-center rounded-[2px] text-[9px] leading-none', surface === 'light' ? 'bg-zero text-ink' : 'bg-zero-dark text-white')} aria-hidden="true">0</span>Zero (observed, no detections)</li>
    <li className={item}><span className={cn('size-3 rounded-[2px] border', surface === 'light' ? 'bg-hatch border-hairline' : 'bg-hatch-dark border-rule')} aria-hidden="true" />No usable data</li>
    <li className={item}><span className={cn('size-3 rounded-[2px] border border-dashed', surface === 'light' ? 'border-muted' : 'border-mist')} aria-hidden="true" />Not published</li>
  </ul>
}
