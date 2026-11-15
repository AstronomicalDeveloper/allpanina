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
import { MONTHS } from '../../services/data/calendar.ts'
import { cellPopup, cellsBounds, filterCells } from '../../services/data/map.ts'
import { buildMapYear } from '../../services/data/mapExploration.ts'
import type { MapCellProperties, MapCells, MapYear } from '../../services/data/mapExploration.ts'
import { loadMapRuntime } from './cartography/mapRuntime.ts'
import type { RuntimeLoader } from './cartography/mapRuntime.ts'
import { applyBasemap, applyOverlayVisibility, buildGraticuleGeoJSON, calculatePercentile, percentileColorExpression } from './cartography/juanLayers.ts'
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
/** Aviso del mapa: mensaje comprensible y, aparte, el detalle técnico original. */
type MapIssue = { message: string; detail?: string }
const problem = (message: string, error?: unknown): MapIssue => ({ message, detail: error === undefined ? undefined : error instanceof Error ? error.message : String(error) })

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
      .catch(error=>{if(active)setIssue(problem('No se pudieron cargar los límites departamentales, así que no se puede enfocar el departamento. No se muestran celdas departamentales hasta recuperarlos.', error))})
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
  const periodLabel = scope === 'year' ? `Acumulado ${year} · ${coverageKnown ? `${usableMonths}/12 meses publicados utilizables` : 'cobertura no disponible'}` : `${MONTHS[month - 1]} ${year}`
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
    const contextLost = (event: Event) => { event.preventDefault(); setReady(false); setIssue(problem('Se perdió el contexto WebGL del navegador. Reintenta el mapa.')) }
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
      map.on('error', event => { if (!cancelled) setIssue(problem('No se pudo cargar un recurso del mapa (fondo, capa de referencia o gráficos). Comprueba la conexión o reintenta; las observaciones no se sustituyen.', event.error ?? 'Error del mapa')) })
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
      timeout = setTimeout(() => { if (!cancelled) setIssue(problem('La carga cartográfica tarda demasiado. Comprueba la conexión o elige otro fondo.')) }, 20000)
    }).catch(error => { if (!cancelled) setIssue(problem('No se pudo iniciar el mapa en este navegador. Prueba a recargar la página o usar otro navegador.', error)) })
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
      if (!cancelled) setIssue(problem('No se pudo enfocar ni resaltar el departamento seleccionado.', error))
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
      .catch(error => { if (!cancelled) setIssue(problem('No se pudo actualizar el resumen del mapa. Reintenta el mapa.', error)) })
    return () => { cancelled = true }
  }, [ready, filteredGeoJson, summaryPoints, departmentSelected])
  useEffect(() => {
    const map = mapRef.current
    if (!map || (!ready && !map.isStyleLoaded())) return
    map.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75))
    map.setPaintProperty('celdas-fill', 'fill-opacity', localOpacity(opacity))
    map.setPaintProperty(POINT_LAYER, 'icon-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75))
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
    map.setPaintProperty(DEPARTMENT_SQUARE_LAYER, 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75))
    map.setPaintProperty(DEPARTMENT_SQUARE_LAYER, 'fill-opacity', symbolOpacity(opacity))
    return () => { map.off('zoomend', updateSquares) }
  }, [ready, department, filteredGeoJson, percentileBreaks, opacity])
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
    catch { setIssue(problem('El navegador no permite pantalla completa.')) }
  }
  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.pathname = '/mapa'
    url.searchParams.delete('view')
    if (!url.searchParams.has('calendarSeries')) url.searchParams.set('calendarSeries', url.searchParams.get('sensor') ?? 'MODIS')
    for (const [key, value] of Object.entries({ mapRegion: selection.region, periodYear: String(year), periodMonth: String(month), sensor, mapSensor: sensor, scope, mapScope: scope })) url.searchParams.set(key, value)
    try { await navigator.clipboard.writeText(url.toString()); setShareNotice({ text: 'Enlace de región, período y sensor copiado.', copied: true }) }
    catch { setShareNotice({ text: `Copia este enlace: ${url.toString()}`, copied: false }) }
  }
  const selectCell = (id: string) => {
    const feature = cellsById.get(id)
    setSelected(feature ? { key: selectionKey, properties: feature.properties } : null)
  }
  return { rootRef, mapContainer, baseMap, setBaseMap, overlays, setOverlays, opacity, setOpacity,
    isFullScreen, cursorCoords, selectedCell, selectCell, ready, issue: issue?.message ?? '', issueDetail: issue?.detail, shareMessage, representation,
    scope, year, month, sensor, yearModel, filteredGeoJson, usableMonths, periodLabel, monthStatus,
    percentileBreaks, stats, resetView, toggleFullscreen, copyLink,
    dismissShare: () => setShareNotice(null),
    retry: () => { setReady(false); setIssue(null); setAttempt(attempt + 1) } }
}
export type MapController = Omit<ReturnType<typeof useJuanMap>, 'rootRef' | 'mapContainer'>
