import { clipDepartmentCells, departmentSquares } from '../../services/data/departmentCells'
import { loadDepartmentNavigation, departmentView } from '../../services/data/departmentNavigation'
import type { DepartmentNavigation } from '../../types/departmentNavigation'
import { DEPARTMENT_SOURCE, DEPARTMENT_SQUARE_SOURCE, DEPARTMENT_SQUARE_LAYER } from './cartography/departmentLayers'
// Lifecycle extracted from Juan Matias's legacy FireMapTest.
// Reuses his map construction, providers, overlays and percentile expressions.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CellsData } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import type * as MapLibre from 'maplibre-gl'
import { formatMonth } from '../../ui/format'
import { cellPopup, cellsBounds, filterCells } from '../../services/data/map.ts'
import { buildMapYear } from '../../services/data/mapExploration.ts'
import type { MapCellProperties, MapCells, MapYear } from '../../services/data/mapExploration.ts'
import { loadMapRuntime } from './cartography/mapRuntime.ts'
import type { RuntimeLoader } from './cartography/mapRuntime.ts'
import { BASEMAP_FALLBACK, BASEMAP_OPTIONS, BASEMAP_SOURCE_IDS, applyBasemap, applyOverlayVisibility, buildGraticuleGeoJSON, calculatePercentile, paletteFor, percentileColorExpression } from './cartography/juanLayers.ts'
import type { BaseMapId, OverlayState } from './cartography/juanLayers.ts'
import { prepareSummaryPoints } from '../../services/data/mapSymbols'
import { SUMMARY_SOURCE, POINT_LAYER, LOCAL_ZOOM, localOpacity, symbolOpacity } from './cartography/multiscaleLayers'
import { createJuanMap } from './cartography/mapConstruction.ts'

interface Props {
  national?: boolean
  data: CellsData
  model?: MapYear
  selection: MapSelection
  runtimeLoader?: RuntimeLoader
}
type Properties = MapCellProperties
/** Map problem: a plain message and, separately, the original technical detail. */
type MapIssue = { message: string; detail?: string }
const problem = (message: string, error?: unknown): MapIssue => ({ message, detail: error === undefined ? undefined : error instanceof Error ? error.message : String(error) })
/** Tile errors tolerated from one provider before switching away from it (a single missing tile is not an outage). */
export const PROVIDER_FAILURES = 3
const basemapLabel = (id: BaseMapId) => BASEMAP_OPTIONS.find(option => option.id === id)?.label ?? id
/** Reference layers by MapLibre source id, with the name the user sees. */
const OVERLAY_SOURCES: Record<string, { key: keyof OverlayState; label: string }> = {
  'overlay-basic-reference': { key: 'basic', label: 'References and boundaries' },
  'overlay-basic-peru': { key: 'basic', label: 'References and boundaries' },
  'overlay-detailed': { key: 'detailed', label: 'Detailed cartography of Peru' },
  'overlay-protected': { key: 'protectedAreas', label: 'Protected natural areas' },
}

export default function useJuanMap({ data, model, selection, runtimeLoader = loadMapRuntime, national = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre.Map | null>(null)
  const popupRef = useRef<MapLibre.Popup | null>(null)
  const [navigation,setNavigation]=useState<DepartmentNavigation|null>(null)
  const focusedRegion=useRef<string|null>(null)
  const [baseMap, setBaseMap] = useState<BaseMapId>('blue-marble')
  const [overlays, setOverlays] = useState<OverlayState>({ graticule: false, basic: false, detailed: false, protectedAreas: false })
  const [opacity, setOpacity] = useState(0.85)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [cursorCoords, setCursorCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })
  const [selected, setSelected] = useState<{ key: string; properties: Properties } | null>(null)
  const [ready, setReady] = useState(false)
  const [issue, setIssue] = useState<MapIssue | null>(null)
  const [shareNotice, setShareNotice] = useState<{ text: string; copied: boolean } | null>(null)
  /** Provider problems that the map already worked around (other base map, layer turned off). Not an error. */
  const [notice, setNotice] = useState('')
  const shareMessage = shareNotice?.text ?? ''
  useEffect(() => {
    if (!shareNotice?.copied) return
    const timeout = setTimeout(() => setShareNotice(null), 4000)
    return () => clearTimeout(timeout)
  }, [shareNotice])
  const [attempt, setAttempt] = useState(0)
  useEffect(()=>{
    if(!national)return
    let active=true
    void loadDepartmentNavigation().then(value=>{if(active)setNavigation(value)})
      .catch(error=>{if(active)setIssue(problem('Department boundaries could not be loaded, so the department cannot be focused. Department cells are hidden until they load.', error))})
    return ()=>{active=false}
  },[national,attempt])
  const year = selection.year ?? 0, month = selection.month ?? 1, sensor = selection.sensor
  const scope = selection.scope ?? 'year'
  const yearModel = useMemo(() => model ?? buildMapYear(data, { region: national?'PE':selection.region, year }), [model, data, selection.region, year, national])
  const selectionKey = JSON.stringify(selection)
  const periodCells: MapCells = useMemo(() => scope === 'year' ? yearModel.annual[sensor] : filterCells(data, {region: selection.region, year, month, sensor}), [scope, yearModel, sensor, data, selection.region, year, month])
  const department = national && selection.region !== 'PE' ? navigation?.features.find(f => f.properties.region_id === selection.region) : undefined
  const departmentSelected = national && selection.region !== 'PE'
  const filteredGeoJson = useMemo(() => department ? clipDepartmentCells(periodCells, department) : departmentSelected ? {type: 'FeatureCollection' as const, features: []} : periodCells, [periodCells, department, departmentSelected])
  const summaryPoints = useMemo(() => prepareSummaryPoints(departmentSelected ? {type: 'FeatureCollection', features: []} : filteredGeoJson, { region: national?'PE':selection.region, year, month, sensor, scope }), [filteredGeoJson, selection.region, year, month, sensor, scope, national, departmentSelected])
  const renderedSummary = useRef<typeof summaryPoints | null>(null)
  const [representation, setRepresentation] = useState<'summary' | 'local'>('summary')
  const usableMonths = yearModel.coverage[sensor].filter(m => m.status === 'ok').length
  const coverageKnown = yearModel.coverage[sensor].some(m => m.status !== 'unknown')
  const periodLabel = scope === 'year' ? `Total ${year} · ${coverageKnown ? `${usableMonths}/12 usable published months` : 'coverage not available'}` : formatMonth(year, month, true)
  const monthStatus = yearModel.coverage[sensor][month - 1]?.status
  const cellsById = useMemo(() => new Map(filteredGeoJson.features.map(f => [f.properties.cell_id, f])), [filteredGeoJson])
  const selectedCell = selected?.key === selectionKey && cellsById.get(selected.properties.cell_id)?.properties === selected.properties ? selected.properties : null
  const percentileBreaks = useMemo(() => {
    const values = filteredGeoJson.features.map(f => f.properties.cell_days)
    return { q25: calculatePercentile(values, .25), q50: calculatePercentile(values, .5), q75: calculatePercentile(values, .75) }
  }, [filteredGeoJson])
  const stats = useMemo(() => ({ count: filteredGeoJson.features.length,
    totalDetections: filteredGeoJson.features.reduce((sum, f) => sum + f.properties.cell_days, 0),
    maxCell: filteredGeoJson.features.reduce((max, f) => Math.max(max, f.properties.cell_days), 0),
  }), [filteredGeoJson])
  const latest = useRef({ data, filteredGeoJson, summaryPoints, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById, periodLabel, sensor, region: selection.region, national, coverage: yearModel.coverage[sensor] })
  useEffect(() => { latest.current = { data, filteredGeoJson, summaryPoints, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById, periodLabel, sensor, region: selection.region, national, coverage: yearModel.coverage[sensor] } }, [data, filteredGeoJson, summaryPoints, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById, periodLabel, sensor, selection.region, yearModel, national])

  useEffect(() => {
    let cancelled = false
    let instance: MapLibre.Map | null = null
    let popup: MapLibre.Popup | null = null
    let observer: ResizeObserver | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    const resize = () => instance?.resize()
    const contextLost = (event: Event) => { event.preventDefault(); setReady(false); setIssue(problem('The browser lost the WebGL context. Retry the map.')) }
    void runtimeLoader().then(runtime => {
      if (cancelled || !mapContainer.current) return
      const current = latest.current
      const map = createJuanMap(runtime, mapContainer.current, current.filteredGeoJson, current.percentileBreaks, current.opacity, current.summaryPoints)
      instance = map; mapRef.current = map
      popup = new runtime.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
      popupRef.current = popup
      const updateRepresentation = () => setRepresentation(map.getZoom() >= LOCAL_ZOOM ? 'local' : 'summary')
      map.on('zoomend', updateRepresentation)
      const pick = (event: MapLibre.MapLayerMouseEvent) => {
        if (renderedSummary.current !== latest.current.summaryPoints) return undefined
        const id: unknown = event.features?.[0]?.properties.cell_id
        return typeof id === 'string' ? latest.current.cellsById.get(id) : undefined
      }
      const popupContent = (properties: Properties) => {
        const coverage = latest.current.coverage
        return cellPopup(properties, { national: latest.current.national, coveredMonths: coverage.some(month => month.status === 'unknown') ? undefined : coverage.filter(month => month.status === 'ok').length })
      }
      for (const layer of ['celdas-fill', POINT_LAYER, DEPARTMENT_SQUARE_LAYER]) {
      map.on('mousemove', layer, event => {
        const feature = pick(event)
        if (feature) { map.getCanvas().style.cursor = 'pointer'; popup?.setLngLat(event.lngLat).setDOMContent(popupContent(feature.properties)).addTo(map) }
      })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; popup?.remove() })
      map.on('click', layer, event => {
        const feature = pick(event)
        if (feature) {
          setSelected({ key: latest.current.selectionKey, properties: feature.properties })
          popup?.setLngLat(event.lngLat).setDOMContent(popupContent(feature.properties)).addTo(map)
        }
      })
      }
      let lastCoordinateUpdate = 0
      map.on('mousemove', event => {
        const now = Date.now()
        if (now - lastCoordinateUpdate < 120) return
        lastCoordinateUpdate = now
        setCursorCoords({ lat: Number(event.lngLat.lat.toFixed(3)), lon: Number(event.lngLat.lng.toFixed(3)) })
      })
      // Provider errors never remove the observations already drawn (C4). A failing base map is replaced by
      // the next one; a failing reference layer is turned off; anything else is reported with a retry.
      const failures = new Map<string, number>()
      map.on('error', event => {
        if (cancelled) return
        const sourceId = (event as { sourceId?: unknown }).sourceId
        if (typeof sourceId === 'string' && (sourceId.startsWith('basemap-') || sourceId in OVERLAY_SOURCES)) {
          const count = (failures.get(sourceId) ?? 0) + 1
          failures.set(sourceId, count)
          if (count !== PROVIDER_FAILURES) return
          const current = latest.current.baseMap
          if (sourceId.startsWith('basemap-')) {
            if (current === 'none' || BASEMAP_SOURCE_IDS[current] !== sourceId) return
            let next = BASEMAP_FALLBACK[current]
            while (next && next !== 'none' && (failures.get(BASEMAP_SOURCE_IDS[next]) ?? 0) >= PROVIDER_FAILURES) next = BASEMAP_FALLBACK[next]
            const target = next ?? 'none'
            setBaseMap(target)
            setNotice(target === 'none'
              ? `${basemapLabel(current)} base map is not available. The observations are shown on a plain background.`
              : `${basemapLabel(current)} base map is not available; showing ${basemapLabel(target)}.`)
          } else {
            const overlay = OVERLAY_SOURCES[sourceId]
            setOverlays(previous => ({ ...previous, [overlay.key]: false }))
            setNotice(`The layer “${overlay.label}” is not available right now and was turned off.`)
          }
          return
        }
        setIssue(problem('A map resource (graphics or style) could not be loaded. Check the connection or retry; the observations are not replaced.', event.error ?? 'Map error'))
      })
      const refreshGrid = () => {
        if (!latest.current.overlays.graticule) return
        const source = map.getSource('graticule-grid') as MapLibre.GeoJSONSource | undefined
        source?.setData(buildGraticuleGeoJSON(map.getBounds(), map.getZoom()))
      }
      map.on('moveend', refreshGrid); map.on('zoomend', refreshGrid)
      map.once('load', () => {
        if (cancelled) return
        clearTimeout(timeout)
        const current = latest.current
        applyBasemap(map, current.baseMap); applyOverlayVisibility(map, current.overlays)
        const bounds = cellsBounds(current.data)
        if (bounds && !current.national) map.fitBounds(bounds, { padding: 45, maxZoom: 11, duration: 0 })
        updateRepresentation()
        setReady(true)
      })
      map.getCanvas().addEventListener('webglcontextlost', contextLost)
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(mapContainer.current) }
      window.addEventListener('resize', resize)
      timeout = setTimeout(() => { if (!cancelled) setIssue(problem('The map is taking too long to load. Check the connection or choose another base map.')) }, 20000)
    }).catch(error => { if (!cancelled) setIssue(problem('The map could not start in this browser. Reload the page or try another browser.', error)) })
    return () => {
      cancelled = true; clearTimeout(timeout); observer?.disconnect()
      window.removeEventListener('resize', resize)
      instance?.getCanvas().removeEventListener('webglcontextlost', contextLost)
      renderedSummary.current = null; focusedRegion.current = null
      popup?.remove(); instance?.remove(); mapRef.current = null; popupRef.current = null
    }
  }, [runtimeLoader, attempt])

  useEffect(() => {
    const map = mapRef.current
    const region = selection.region || 'PE'
    if (!national || !ready || !navigation || !map || focusedRegion.current === region) return
    let cancelled = false
    const focusDepartment = async () => {
      const view = departmentView(navigation, region)
      const layers = ['departamento-limite']
      for (const layer of layers) map.setLayoutProperty(layer, 'visibility', 'none')
      const updates = [
        (map.getSource(DEPARTMENT_SOURCE) as MapLibre.GeoJSONSource).setData(view.boundary),
      ]
      focusedRegion.current = region
      // Focus only on a changed region or new map instance, never on camera movement.
      map.fitBounds(view.bounds, { padding: 60, maxZoom: 12, duration: 0 })
      await Promise.all(updates)
      if (!cancelled) for (const layer of layers) map.setLayoutProperty(layer, 'visibility', 'visible')
    }
    void focusDepartment().catch(error => {
      if (!cancelled) setIssue(problem('The selected department could not be focused or highlighted.', error))
    })
    return () => { cancelled = true }
  }, [national, ready, navigation, selection.region])

  useEffect(() => {
    const map = mapRef.current
    if (!map || (!ready && !map.isStyleLoaded())) return
    let cancelled = false
    renderedSummary.current = null
    popupRef.current?.remove()
    const observedLayers = ['celdas-fill', 'celdas-line', POINT_LAYER]
    for (const layer of observedLayers) map.setLayoutProperty(layer, 'visibility', 'none')
    const work = [
      (map.getSource('celdas-observadas') as MapLibre.GeoJSONSource).setData(filteredGeoJson),
      (map.getSource(SUMMARY_SOURCE) as MapLibre.GeoJSONSource).setData(summaryPoints),
    ]
    void Promise.all(work).then(() => { if (!cancelled) {
      renderedSummary.current = summaryPoints
      for (const layer of observedLayers) map.setLayoutProperty(layer, 'visibility', layer === 'celdas-line' && departmentSelected ? 'none' : 'visible')
    } })
      .catch(error => { if (!cancelled) setIssue(problem('The map summary could not be updated. Retry the map.', error)) })
    return () => { cancelled = true }
  }, [ready, filteredGeoJson, summaryPoints, departmentSelected])
  useEffect(() => {
    const map = mapRef.current
    if (!map || (!ready && !map.isStyleLoaded())) return
    const palette = paletteFor(baseMap)
    map.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75, palette))
    map.setPaintProperty('celdas-fill', 'fill-opacity', localOpacity(opacity))
    map.setPaintProperty(POINT_LAYER, 'icon-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75, palette))
    map.setPaintProperty(POINT_LAYER, 'icon-opacity', symbolOpacity(opacity))
    applyBasemap(map, baseMap); applyOverlayVisibility(map, overlays)
    if (overlays.graticule) (map.getSource('graticule-grid') as MapLibre.GeoJSONSource).setData(buildGraticuleGeoJSON(map.getBounds(), map.getZoom()))
  }, [ready, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const updateSquares = () => {
      const squares = department ? departmentSquares(filteredGeoJson, department, map.getZoom()) : {type: 'FeatureCollection' as const, features: []}
      ;(map.getSource(DEPARTMENT_SQUARE_SOURCE) as MapLibre.GeoJSONSource).setData(squares)
    }
    updateSquares()
    if (!department) return
    map.on('zoomend', updateSquares)
    map.setPaintProperty(DEPARTMENT_SQUARE_LAYER, 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75, paletteFor(baseMap)))
    map.setPaintProperty(DEPARTMENT_SQUARE_LAYER, 'fill-opacity', symbolOpacity(opacity))
    return () => { map.off('zoomend', updateSquares) }
  }, [ready, department, filteredGeoJson, percentileBreaks, opacity, baseMap])
  useEffect(() => {
    const root = rootRef.current
    const sync = () => { setIsFullScreen(document.fullscreenElement === rootRef.current); mapRef.current?.resize() }
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement === root) void document.exitFullscreen?.().catch(() => {})
    }
  }, [])
  const resetView = () => {
    const bounds=national&&navigation?departmentView(navigation,selection.region||'PE').bounds:cellsBounds(data)
    if(bounds)mapRef.current?.fitBounds(bounds,{padding:60,maxZoom:12})
  }
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement === rootRef.current) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen() }
    catch { setIssue(problem('This browser does not allow full screen.')) }
  }
  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.pathname = '/map'
    url.searchParams.delete('view')
    if (!url.searchParams.has('calendarSeries')) url.searchParams.set('calendarSeries', url.searchParams.get('sensor') ?? 'MODIS')
    for (const [key, value] of Object.entries({ mapRegion: selection.region, periodYear: String(year), periodMonth: String(month), sensor, mapSensor: sensor, scope, mapScope: scope })) url.searchParams.set(key, value)
    try { await navigator.clipboard.writeText(url.toString()); setShareNotice({ text: 'Link to this region, period and sensor copied.', copied: true }) }
    catch { setShareNotice({ text: `Copy this link: ${url.toString()}`, copied: false }) }
  }
  const selectCell = (id: string) => {
    const feature = cellsById.get(id)
    setSelected(feature ? { key: selectionKey, properties: feature.properties } : null)
  }
  /** Choosing a base map or layer by hand clears an earlier provider notice. */
  const chooseBaseMap = (id: BaseMapId) => { setNotice(''); setBaseMap(id) }
  const chooseOverlays = (next: OverlayState) => { setNotice(''); setOverlays(next) }
  return { rootRef, mapContainer, baseMap, setBaseMap: chooseBaseMap, overlays, setOverlays: chooseOverlays, opacity, setOpacity, notice, dismissNotice: () => setNotice(''),
    isFullScreen, cursorCoords, selectedCell, selectCell, ready, issue: issue?.message ?? '', issueDetail: issue?.detail, shareMessage, representation,
    scope, year, month, sensor, yearModel, filteredGeoJson, usableMonths, periodLabel, monthStatus,
    percentileBreaks, stats, resetView, toggleFullscreen, copyLink,
    dismissShare: () => setShareNotice(null),
    retry: () => { setReady(false); setIssue(null); setAttempt(attempt + 1) } }
}
export type MapController = Omit<ReturnType<typeof useJuanMap>, 'rootRef' | 'mapContainer'>
