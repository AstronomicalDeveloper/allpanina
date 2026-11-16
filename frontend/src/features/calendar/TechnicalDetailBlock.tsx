import { Disclosure } from '../../ui'
import type { CalibratedRecord, MonthlyRecord } from '../../types/data'
import type { CalendarSeries } from '../../types/selection'

/** Procedencia del valor, plegada: los códigos y campos del archivo publicado solo aparecen aquí. */
export default function TechnicalDetailBlock({ region, series, record, b1, sourceUrl }: {
  region: string; series: CalendarSeries; record?: MonthlyRecord; b1?: CalibratedRecord; sourceUrl: string
}) {
  const rows: [string, string][] = series === 'B1'
    ? [['region_id', region], ['method', 'B1'], ['value', b1?.value === null || b1?.value === undefined ? 'empty' : String(b1.value)], ['split', b1?.split ?? 'no row'], ['status', b1?.status ?? 'no row'], ['residual', b1?.residual === null || b1?.residual === undefined ? 'empty' : String(b1.residual)]]
    : [['region_id', region], ['sensor_group', series], ['cell_days', record?.cell_days === null || record?.cell_days === undefined ? 'empty' : String(record.cell_days)], ['status', record?.status ?? 'no published row'], ['source_version', record?.source_version ?? 'not available'], ['updated_at', record?.updated_at ?? 'not available']]
  return <Disclosure summary="Technical detail" className="calendar-technical">
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
      {rows.map(([key, value]) => <div key={key} className="contents"><dt>{key}</dt><dd className="m-0 break-all text-ink">{value}</dd></div>)}
    </dl>
    {sourceUrl && <p className="mb-0 mt-3"><a className="text-cinder underline underline-offset-4" href={series === 'B1' ? sourceUrl.replace(/monthly_series\.csv$/, 'calibrated_series.csv') : sourceUrl}>Published file</a></p>}
    <p className="mb-0 mt-2 text-xs">updated_at is when the file was updated, not the date of a detection.</p>
  </Disclosure>
}
