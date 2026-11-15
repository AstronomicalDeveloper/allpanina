import { datasetMode, datasetRoot } from '../../services/data/geography'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useExplorationSelection from '../../app/useExplorationSelection'
import { loadCells, loadManifest, loadMonthlySeries } from '../../services/data/loaders'
import { cellsFile } from '../../services/data/map'
import { buildMapYear } from '../../services/data/mapExploration'
import type { CellsData, Manifest, MonthlyRecord } from '../../types/data'
import type { MapSelection } from '../../types/selection'
import type { RuntimeLoader } from './cartography/mapRuntime'
import MapWorkspace from './sections/MapWorkspace'
import TechnicalDetail from '../../components/ui/TechnicalDetail'

type State = { status: 'loading' } | { status: 'error'; message: string } | {
  status: 'loaded'; data: CellsData | null; manifest: Manifest; records: MonthlyRecord[]; years: number[]; region: string; year: number | null
}
const empty: CellsData = { type: 'FeatureCollection', features: [] }

function MapData({ dataRoot, selection, onChange, runtimeLoader }: {
  dataRoot: string; selection: MapSelection; onChange: (next: MapSelection) => void; runtimeLoader?: RuntimeLoader
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const national=dataRoot.endsWith('/peru')
  const requestedRegion=national?'PE':selection.region, requestedYear=selection.year
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      const [manifest, records] = await Promise.all([loadManifest(`${dataRoot}/manifest.json`, controller.signal), loadMonthlySeries(`${dataRoot}/monthly_series.csv`, controller.signal)])
      const region = requestedRegion || manifest.region_id
      const prefix = `cells_${manifest.region_id}_`
      const years = manifest.files.flatMap(file => {
        const suffix = file.startsWith(prefix) && file.endsWith('.geojson') ? file.slice(prefix.length, -8) : ''
        return /^\d{4}$/.test(suffix) ? [Number(suffix)] : []
      }).sort((a, b) => a - b)
      const year = requestedYear ?? years.at(-1) ?? null
      const file = cellsFile(manifest, { region, year })
      const data = file ? await loadCells(`${dataRoot}/${encodeURIComponent(file)}`, controller.signal) : null
      if (!controller.signal.aborted) setState({ status: 'loaded', data, manifest, records, years, region, year })
    })().catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Error de lectura' })
    })
    return () => controller.abort()
  }, [dataRoot, requestedRegion, requestedYear, attempt])
  const model = useMemo(() => {
    if (state.status !== 'loaded') return null
    try { return { ok: true as const, value: buildMapYear(state.data ?? empty, state, state.data ? state.records : undefined) } }
    catch (error) { return { ok: false as const, message: error instanceof Error ? error.message : 'Datos geográficos inconsistentes' } }
  }, [state])
  if (state.status === 'loading') return <p className="map-state" role="status">Cargando observaciones y cobertura del período…</p>
  if (state.status === 'error') return <div className="map-state" role="alert"><h2>No se pudieron cargar las observaciones</h2><p>Comprueba la conexión y vuelve a intentarlo. No se muestran valores de reemplazo.</p><TechnicalDetail detail={state.message} /><button onClick={() => { setState({ status: 'loading' }); setAttempt(attempt + 1) }}>Reintentar datos</button></div>
  if (state.year === null) return <p className="map-state" role="status">No hay años geográficos publicados en este conjunto. Revisa el manifiesto de datos.</p>
  if (!model?.ok) return <div className="map-state" role="alert"><h2>Los datos geográficos no son consistentes</h2><p>Los archivos publicados para este período no coinciden entre sí, por lo que el mapa no se dibuja. No se generan valores de reemplazo.</p><TechnicalDetail detail={model?.message} /></div>
  const months = state.records.filter(row => row.region_id === state.region && row.year === state.year && row.sensor_group === selection.sensor && row.status === 'ok').map(row => row.month)
  if (national && !state.manifest.regions?.includes(selection.region || 'PE')) return <p className="map-state" role="alert">Región no válida en el manifiesto nacional.</p>
  const effective = { ...selection, region: national ? selection.region || 'PE' : state.region, year: state.year, month: selection.month ?? Math.max(1, ...months), scope: selection.scope ?? 'year' }
  return <MapWorkspace data={state.data ?? empty} model={model.value} selection={effective}
    years={[...new Set([...state.years, ...(state.year === null ? [] : [state.year])])]} onChange={next => onChange({ ...next, region: selection.region, year: next.year === state.year ? requestedYear : next.year })}
    national={national} records={state.records} unavailable={!state.data} manifest={state.manifest} demo={dataRoot.endsWith('/demo')} runtimeLoader={runtimeLoader} />
}

export default function MapPage({ runtimeLoader }: { runtimeLoader?: RuntimeLoader }) {
  const [params] = useSearchParams()
  const { selection, changeMap } = useExplorationSelection()
  const mode=datasetMode(params),dataRoot=datasetRoot(mode)
  const mapSelection = { region: selection.region, year: selection.year, month: selection.month, scope: selection.scope, sensor: selection.mapSensor }
  return <section className="map-page-v2" aria-label="Exploración geográfica">
    <h1 className="map-sr-only">Mapa de observaciones</h1>
    <MapData key={`${dataRoot}-${mode==='peru'?'PE':selection.region}-${selection.year}`} dataRoot={dataRoot} selection={mapSelection} onChange={changeMap} runtimeLoader={runtimeLoader} />
  </section>
}
