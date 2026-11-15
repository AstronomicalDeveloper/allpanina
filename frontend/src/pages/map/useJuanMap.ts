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
import { createJuanMap } from './cartography/mapConstruction.ts'

interface Props {
  data: CellsData
  model?: MapYear
  selection: MapSelection
  runtimeLoader?: RuntimeLoader
}
type Properties = MapCellProperties

export default function useJuanMap({ data, model, selection, runtimeLoader = loadMapRuntime }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre.Map | null>(null)
  const popupRef = useRef<MapLibre.Popup | null>(null)
  const [baseMap, setBaseMap] = useState<BaseMapId>('blue-marble')
  const [overlays, setOverlays] = useState<OverlayState>({ graticule: false, basic: false, detailed: false, protectedAreas: false })
  const [opacity, setOpacity] = useState(0.85)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [cursorCoords, setCursorCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })
  const [selected, setSelected] = useState<{ key: string; properties: Properties } | null>(null)
  const [ready, setReady] = useState(false)
  const [issue, setIssue] = useState('')
  const [shareNotice, setShareNotice] = useState<{ text: string; copied: boolean } | null>(null)
  const shareMessage = shareNotice?.text ?? ''
  useEffect(() => {
    if (!shareNotice?.copied) return
    const timeout = setTimeout(() => setShareNotice(null), 4000)
    return () => clearTimeout(timeout)
  }, [shareNotice])
  const [attempt, setAttempt] = useState(0)
  const year = selection.year ?? 0, month = selection.month ?? 1, sensor = selection.sensor
  const scope = selection.scope ?? 'year'
  const yearModel = useMemo(() => model ?? buildMapYear(data, { region: selection.region, year }), [model, data, selection.region, year])
  const selectionKey = JSON.stringify(selection)
  const filteredGeoJson: MapCells = useMemo(() => scope === 'year' ? yearModel.annual[sensor] : filterCells(data, selection), [scope, yearModel, sensor, data, selection])
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
  const latest = useRef({ data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById })
  useEffect(() => { latest.current = { data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById } }, [data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey, cellsById])

  useEffect(() => {
    let cancelled = false
    let instance: MapLibre.Map | null = null
    let popup: MapLibre.Popup | null = null
    let observer: ResizeObserver | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined
    const resize = () => instance?.resize()
    const contextLost = (event: Event) => { event.preventDefault(); setReady(false); setIssue('Se perdió el contexto WebGL. Reintenta el mapa.') }
    void runtimeLoader().then(runtime => {
      if (cancelled || !mapContainer.current) return
      const current = latest.current
      const map = createJuanMap(runtime, mapContainer.current, current.filteredGeoJson, current.percentileBreaks, current.opacity)
      instance = map; mapRef.current = map
      popup = new runtime.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
      popupRef.current = popup
      const pick = (event: MapLibre.MapLayerMouseEvent) => {
        const id: unknown = event.features?.[0]?.properties.cell_id
        return typeof id === 'string' ? latest.current.cellsById.get(id) : undefined
      }
      map.on('mousemove', 'celdas-fill', event => {
        const feature = pick(event)
        if (feature) { map.getCanvas().style.cursor = 'pointer'; popup?.setLngLat(event.lngLat).setDOMContent(cellPopup(feature.properties)).addTo(map) }
      })
      let lastCoordinateUpdate = 0
      map.on('mousemove', event => {
        const now = Date.now()
        if (now - lastCoordinateUpdate < 120) return
        lastCoordinateUpdate = now
        setCursorCoords({ lat: Number(event.lngLat.lat.toFixed(3)), lon: Number(event.lngLat.lng.toFixed(3)) })
      })
      map.on('mouseleave', 'celdas-fill', () => { map.getCanvas().style.cursor = ''; popup?.remove() })
      map.on('click', 'celdas-fill', event => {
        const feature = pick(event)
        if (feature) setSelected({ key: latest.current.selectionKey, properties: feature.properties })
      })
      map.on('error', event => { if (!cancelled) setIssue(`Recurso cartográfico o WebGL no disponible: ${event.error?.message ?? 'Error del mapa'}. Las celdas locales no se sustituyen.`) })
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
        ;(map.getSource('celdas-observadas') as MapLibre.GeoJSONSource).setData(current.filteredGeoJson)
        applyBasemap(map, current.baseMap); applyOverlayVisibility(map, current.overlays)
        const bounds = cellsBounds(current.data)
        if (bounds) map.fitBounds(bounds, { padding: 45, maxZoom: 11, duration: 0 })
        setReady(true)
      })
      map.getCanvas().addEventListener('webglcontextlost', contextLost)
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(mapContainer.current) }
      window.addEventListener('resize', resize)
      timeout = setTimeout(() => { if (!cancelled) setIssue('La carga cartográfica tarda demasiado. Comprueba la conexión o elige otro fondo.') }, 20000)
    }).catch(error => { if (!cancelled) setIssue(`No se pudo iniciar el mapa WebGL/worker: ${error instanceof Error ? error.message : 'Error desconocido'}`) })
    return () => {
      cancelled = true; clearTimeout(timeout); observer?.disconnect()
      window.removeEventListener('resize', resize)
      instance?.getCanvas().removeEventListener('webglcontextlost', contextLost)
      popup?.remove(); instance?.remove(); mapRef.current = null; popupRef.current = null
    }
  }, [runtimeLoader, attempt])

  useEffect(() => {
    const map = mapRef.current
    if (!map || (!ready && !map.isStyleLoaded())) return
    popupRef.current?.remove()
    ;(map.getSource('celdas-observadas') as MapLibre.GeoJSONSource).setData(filteredGeoJson)
    map.setPaintProperty('celdas-fill', 'fill-color', percentileColorExpression(percentileBreaks.q25, percentileBreaks.q50, percentileBreaks.q75))
    map.setPaintProperty('celdas-fill', 'fill-opacity', opacity)
    applyBasemap(map, baseMap); applyOverlayVisibility(map, overlays)
    if (overlays.graticule) (map.getSource('graticule-grid') as MapLibre.GeoJSONSource).setData(buildGraticuleGeoJSON(map.getBounds(), map.getZoom()))
  }, [ready, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays])
  useEffect(() => {
    const root = rootRef.current
    const sync = () => { setIsFullScreen(document.fullscreenElement === rootRef.current); mapRef.current?.resize() }
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement === root) void document.exitFullscreen?.().catch(() => {})
    }
  }, [])
  const resetView = () => { const bounds = cellsBounds(data); if (bounds) mapRef.current?.fitBounds(bounds, { padding: 45, maxZoom: 11 }) }
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement === rootRef.current) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen() }
    catch { setIssue('El navegador no permite pantalla completa.') }
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
    isFullScreen, cursorCoords, selectedCell, selectCell, ready, issue, shareMessage,
    scope, year, month, sensor, yearModel, filteredGeoJson, usableMonths, periodLabel, monthStatus,
    percentileBreaks, stats, resetView, toggleFullscreen, copyLink,
    dismissShare: () => setShareNotice(null),
    retry: () => { setReady(false); setIssue(''); setAttempt(attempt + 1) } }
}
export type MapController = Omit<ReturnType<typeof useJuanMap>, 'rootRef' | 'mapContainer'>
