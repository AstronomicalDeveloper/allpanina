import { useMemo } from 'react'
import { MONTHS } from '../../../services/data/calendar'
import type { MapSelection } from '../../../types/selection'
import type { MapController } from '../useJuanMap'
import AnnualCellDetail from '../cartography/AnnualCellDetail'
export default function ExplorationPanel({ map, selection, years, onChange, unavailable }: {
  map: MapController; selection: MapSelection; years: number[]; onChange: (next: MapSelection) => void; unavailable: boolean
}) {
  const cellOptions = useMemo(() => map.filteredGeoJson.features.map(feature => <option key={feature.properties.cell_id} value={feature.properties.cell_id}>{feature.properties.cell_id}: {feature.properties.cell_days} días-celda</option>), [map.filteredGeoJson])
  const coverage = map.yearModel.coverage[map.sensor]
  const valid = map.scope === 'year' ? map.usableMonths > 0 : map.monthStatus === 'ok'
  return <div className="map-panel-content">
    <fieldset><legend>Período de observación</legend><div className="map-segment" aria-label="Modalidad del mapa">{([['year', 'Anual'], ['month', 'Mensual']] as const).map(([scope, label]) => <button key={scope} aria-pressed={map.scope === scope} onClick={() => onChange({ ...selection, scope })}>{label}</button>)}</div>
      <div className="map-period-fields"><label>Año<select aria-label="Año del mapa" value={selection.year ?? ''} onChange={event => onChange({ ...selection, year: Number(event.target.value) })}>{years.map(year => <option key={year}>{year}</option>)}</select></label>
      {map.scope === 'month' && <label>Mes<select aria-label="Mes del mapa" value={selection.month ?? 1} onChange={event => onChange({ ...selection, month: Number(event.target.value) })}>{MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>}</div>
    </fieldset>
    <fieldset><legend>Instrumento satelital</legend><div className="map-segment">{(['MODIS', 'VIIRS'] as const).map(sensor => <button key={sensor} aria-pressed={map.sensor === sensor} onClick={() => onChange({ ...selection, sensor })}>{sensor}</button>)}</div></fieldset>
    <section className="map-observed" aria-label="Resumen observado" aria-live="polite"><h3>{map.scope === 'year' ? `Acumulado ${map.year}` : `${MONTHS[map.month - 1]} ${map.year}`} <small>{map.sensor}</small></h3>
      {unavailable ? <p role="status">No hay GeoJSON publicado para este año y región. Elige otro período. La ausencia de archivo no equivale a cero.</p>
        : valid ? <><strong className="map-observed-value">{map.stats.totalDetections.toLocaleString('es-PE')}</strong><span>días-celda observados</span><p>{map.stats.count} celdas con registro · máximo {map.stats.maxCell} días-celda por celda</p>{map.stats.totalDetections === 0 && <p>Cero válido: período utilizable sin detecciones registradas.</p>}</>
        : <p>{map.monthStatus === 'missing' && map.scope === 'month' ? 'Sin dato utilizable' : map.scope === 'month' ? 'Período no publicado' : 'Sin meses utilizables'}. No se interpreta como cero.</p>}
      {map.scope === 'year' && !unavailable && <><p className="map-coverage-badge">{map.usableMonths === 12 ? 'Año completo' : 'Año parcial'} · {map.usableMonths}/12 meses utilizables</p><details><summary>Disponibilidad mensual</summary><ul>{coverage.map(month => <li key={month.month}>{MONTHS[month.month - 1]}: {month.status === 'ok' ? 'publicado utilizable' : month.status === 'missing' ? 'sin dato utilizable' : 'no publicado'}</li>)}</ul></details></>}
    </section>
    <section className="map-inspector" aria-label="Inspector de celda"><h3>Inspector de celda</h3><p>Selecciona una celda en el mapa o elige su identificador.</p>
      <label>Celda (teclado)<select aria-label="Seleccionar celda del mapa" value={map.selectedCell?.cell_id ?? ''} onChange={event => map.selectCell(event.target.value)}><option value="">Elegir celda</option>{cellOptions}</select></label>
      {map.selectedCell && <div className="map-cell-detail"><h4>{map.selectedCell.cell_id}</h4><p>{selection.region} · {map.sensor}</p>
        {map.scope === 'year' ? <AnnualCellDetail cell={map.selectedCell} model={map.yearModel} /> : <p><strong>{map.selectedCell.cell_days} días-celda</strong> · {MONTHS[map.month - 1]} {map.year}</p>}
        <button onClick={() => map.selectCell('')}>Quitar selección</button>
      </div>}
    </section>
    <p className="map-fine-print">Observaciones, no incendios confirmados ni superficie quemada. No se aplica B1 por celda. La disponibilidad publicada no mide cobertura de nubes.</p>
  </div>
}
