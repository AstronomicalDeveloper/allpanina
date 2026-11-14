import { useEffect, useState } from 'react'
import type { CellsData } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import { loadCells, loadManifest } from '../../services/data/loaders.ts'
import { cellsFile } from '../../services/data/map.ts'
import { FireMapTest } from './FireMapTest.tsx'
import type { RuntimeLoader } from './mapRuntime.ts'

interface Props {
  dataRoot: string
  selection: MapSelection
  onSelectionChange: (selection: MapSelection) => void
  runtimeLoader?: RuntimeLoader
}
type State = { status: 'loading' } | { status: 'error'; message: string } | {
  status: 'loaded'; data: CellsData | null; region: string; year: number | null; years: number[]; manifestRegion: string
}

function MapData({ dataRoot, selection, onSelectionChange, runtimeLoader }: Props) {
  const { region: requestedRegion, year: requestedYear } = selection
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const root = dataRoot.replace(/\/$/, '')
      const manifest = await loadManifest(`${root}/manifest.json`, controller.signal)
      const region = requestedRegion || manifest.region
      const prefix = `cells_${manifest.region}_`
      const years = manifest.files.flatMap(file => {
        const match = file.name.startsWith(prefix) && file.name.endsWith('.geojson') ? file.name.slice(prefix.length, -8) : ''
        return /^\d{4}$/.test(match) ? [Number(match)] : []
      }).sort((a, b) => a - b)
      const year = requestedYear ?? years[0] ?? null
      const file = cellsFile(manifest, { region, year })
      const data = file ? await loadCells(`${root}/${encodeURIComponent(file)}`, controller.signal) : null
      if (!controller.signal.aborted) setState({ status: 'loaded', data, region, year, years, manifestRegion: manifest.region })
    })().catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Error de lectura' })
    })
    return () => controller.abort()
  }, [dataRoot, requestedRegion, requestedYear, attempt])

  if (state.status === 'loading') return <p role="status">Cargando GeoJSON y manifiesto…</p>
  if (state.status === 'error') return <div role="alert">No se pudo cargar el GeoJSON o manifiesto: {state.message}
    <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(attempt + 1) }}>Reintentar datos</button>
  </div>
  const effective = { ...selection, region: state.region, year: state.year, month: selection.month ?? state.data?.features[0]?.properties.month ?? 1 }
  const years = [...new Set([...state.years, ...(state.year === null ? [] : [state.year])])].sort((a, b) => a - b)
  return <>
    <div className="map-file-filters">
      <label>Región del mapa<select aria-label="Región del mapa" value={effective.region} onChange={event => onSelectionChange({ ...effective, region: event.target.value })}>
        {[...new Set([state.manifestRegion, effective.region])].map(region => <option key={region}>{region}</option>)}
      </select></label>
      <label>Archivo anual<select aria-label="Archivo anual del mapa" value={effective.year ?? ''} onChange={event => onSelectionChange({ ...effective, year: Number(event.target.value) })}>
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </select></label>
    </div>
    {!state.data ? <p role="status">No hay GeoJSON disponible para {state.region} / {state.year ?? 'año no especificado'}. No se generan observaciones de reemplazo.</p>
      : <FireMapTest key={`${state.region}-${state.year}`} data={state.data} selection={effective} availableYears={years} onSelectionChange={onSelectionChange} runtimeLoader={runtimeLoader} />}
  </>
}

export default function MapPage(props: Props) {
  // Changing the requested file remounts loading state; month/sensor only filter locally.
  return <main className="map-page">
    <h1>Mapa de observaciones</h1>
    <p><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>
    <p>GeoJSON WGS84 · n_detections: conteos observados por celda según el contrato, ilustrados con fixtures sintéticos. No es indicator regional ni superficie quemada. No se aplica B1.</p>
    <MapData key={`${props.dataRoot}-${props.selection.region}-${props.selection.year}`} {...props} />
  </main>
}
