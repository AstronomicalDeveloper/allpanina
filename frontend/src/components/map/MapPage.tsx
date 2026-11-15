import { useEffect, useMemo, useState } from 'react'
import type { CellsData, MonthlyRecord } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import { loadCells, loadManifest, loadMonthlySeries } from '../../services/data/loaders.ts'
import { cellsFile } from '../../services/data/map.ts'
import { buildMapYear } from '../../services/data/mapExploration.ts'
import { MONTHS } from '../../services/data/calendar.ts'
import { FireMapTest } from './FireMapTest.tsx'
import type { RuntimeLoader } from './mapRuntime.ts'

interface Props {
  dataRoot: string
  selection: MapSelection
  onSelectionChange: (selection: MapSelection) => void
  runtimeLoader?: RuntimeLoader
}
type State = { status: 'loading' } | { status: 'error'; message: string } | {
  status: 'loaded'; data: CellsData | null; records: MonthlyRecord[]; region: string; year: number | null; years: number[]; manifestRegion: string
}

function MapData({ dataRoot, selection, onSelectionChange, runtimeLoader }: Props) {
  const { region: requestedRegion, year: requestedYear } = selection
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const root = dataRoot.replace(/\/$/, '')
      const [manifest, records] = await Promise.all([
        loadManifest(`${root}/manifest.json`, controller.signal),
        loadMonthlySeries(`${root}/monthly_series.csv`, controller.signal),
      ])
      const region = requestedRegion || manifest.region_id
      const prefix = `cells_${manifest.region_id}_`
      const years = manifest.files.flatMap(file => {
        const match = file.startsWith(prefix) && file.endsWith('.geojson') ? file.slice(prefix.length, -8) : ''
        return /^\d{4}$/.test(match) ? [Number(match)] : []
      }).sort((a, b) => a - b)
      const year = requestedYear ?? years.at(-1) ?? null
      const file = cellsFile(manifest, { region, year })
      const data = file ? await loadCells(`${root}/${encodeURIComponent(file)}`, controller.signal) : null
      if (!controller.signal.aborted) setState({ status: 'loaded', data, records, region, year, years, manifestRegion: manifest.region_id })
    })().catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Error de lectura' })
    })
    return () => controller.abort()
  }, [dataRoot, requestedRegion, requestedYear, attempt])

  const derived = useMemo(() => {
    if (state.status !== 'loaded' || !state.data) return null
    try { return { ok: true as const, model: buildMapYear(state.data, state, state.records) } }
    catch (error) { return { ok: false as const, message: error instanceof Error ? error.message : 'Datos geográficos inconsistentes' } }
  }, [state])

  if (state.status === 'loading') return <p role="status">Cargando GeoJSON y manifiesto…</p>
  if (state.status === 'error') return <div role="alert">No se pudo cargar el GeoJSON, manifiesto o cobertura mensual: {state.message}
    <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(attempt + 1) }}>Reintentar datos</button>
  </div>
  const availableMonths = state.records.filter(r => r.region_id === state.region && r.year === state.year && r.status === 'ok').map(r => r.month)
  const effective = { ...selection, scope: selection.scope ?? 'year', region: state.region, year: state.year, month: selection.month ?? (availableMonths.length ? Math.max(...availableMonths) : 1) }
  const years = [...new Set([...state.years, ...(state.year === null ? [] : [state.year])])].sort((a, b) => a - b)
  return <>
    <div className="map-file-filters">
      <label>Modalidad<select aria-label="Modalidad del mapa" value={effective.scope} onChange={event => onSelectionChange({ ...effective, scope: event.target.value === 'month' ? 'month' : 'year' })}>
        <option value="year">Anual</option><option value="month">Mensual</option>
      </select></label>
      <label>Región del mapa<select aria-label="Región del mapa" value={effective.region} onChange={event => onSelectionChange({ ...effective, region: event.target.value })}>
        {[...new Set([state.manifestRegion, effective.region])].map(region => <option key={region}>{region}</option>)}
      </select></label>
      <label>Archivo anual<select aria-label="Archivo anual del mapa" value={effective.year ?? ''} onChange={event => onSelectionChange({ ...effective, year: Number(event.target.value) })}>
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </select></label>
    </div>
    {!state.data ? <p role="status">No hay GeoJSON disponible para {state.region} / {state.year ?? 'año no especificado'}. No se generan observaciones de reemplazo.</p>
      : derived && !derived.ok ? <p role="alert">No se puede representar este año: {derived.message}. Revisa la entrega de datos.</p>
      : derived?.ok && <>
        <p className="map-coverage">{effective.scope === 'year'
          ? `${derived.model.coverage[effective.sensor].every(m => m.status === 'ok') ? 'Año completo' : 'Año parcial'} ${state.year} · meses disponibles: ${derived.model.coverage[effective.sensor].filter(m => m.status === 'ok').map(m => MONTHS[m.month - 1]).join(', ') || 'ninguno'} (${derived.model.coverage[effective.sensor].filter(m => m.status === 'ok').length}/12).`
          : `Mes específico: ${MONTHS[effective.month - 1]} ${state.year}.`}
          {' '}Disponibilidad según monthly_series.csv; no certifica cobertura de nubes ni observación continua.
        </p>
        {effective.scope === 'year' && <p className="map-coverage-gaps">
          Sin dato utilizable: {derived.model.coverage[effective.sensor].filter(m => m.status === 'missing').map(m => MONTHS[m.month - 1]).join(', ') || 'ninguno'}.
          {' '}No publicados: {derived.model.coverage[effective.sensor].filter(m => m.status === 'unpublished').map(m => MONTHS[m.month - 1]).join(', ') || 'ninguno'}.
        </p>}
        <FireMapTest demo={dataRoot.includes('/demo')} key={`${state.region}-${state.year}`} data={state.data} model={derived.model} selection={effective} availableYears={years} onSelectionChange={onSelectionChange} runtimeLoader={runtimeLoader} />
      </>}
  </>
}

export default function MapPage(props: Props) {
  // Changing the requested file remounts loading state; month/sensor only filter locally.
  return <main className="map-page">
    <h1>Mapa de observaciones</h1>
    {props.dataRoot.includes('/demo') && <p><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>}
    <p>GeoJSON WGS84 · cell_days: días observados con detecciones por celda. No es una estimación regional ni superficie quemada. No se aplica B1.</p>
    <MapData key={`${props.dataRoot}-${props.selection.region}-${props.selection.year}`} {...props} />
  </main>
}
