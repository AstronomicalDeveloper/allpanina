// Cartographic style, controls, legend and inspector adapted from Juan Matias's
// FireMapTest.tsx in docs/NASA SAC.zip. See README for retained/deferred features.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CellsData, Sensor } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import type * as MapLibre from 'maplibre-gl'
import { MONTHS } from '../../services/data/calendar.ts'
import { cellPopup, cellsBounds, filterCells } from '../../services/data/map.ts'
import { loadMapRuntime } from './mapRuntime.ts'
import type { RuntimeLoader } from './mapRuntime.ts'
import { BASEMAP_OPTIONS, applyBasemap, applyOverlayVisibility, buildGraticuleGeoJSON, calculatePercentile, percentileColorExpression } from './juanLayers.ts'
import type { BaseMapId, OverlayState } from './juanLayers.ts'
import { createJuanMap } from './mapConstruction.ts'

interface Props {
  data: CellsData
  selection: MapSelection
  availableYears: number[]
  onSelectionChange: (selection: MapSelection) => void
  runtimeLoader?: RuntimeLoader
}
type Properties = CellsData['features'][number]['properties']
const checkLabelStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }

export function FireMapTest({ data, selection, availableYears, onSelectionChange, runtimeLoader = loadMapRuntime }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre.Map | null>(null)
  const popupRef = useRef<MapLibre.Popup | null>(null)
  const [baseMap, setBaseMap] = useState<BaseMapId>('blue-marble')
  const [overlays, setOverlays] = useState<OverlayState>({ graticule: false, basic: false, detailed: false, protectedAreas: false })
  const [showMenu, setShowMenu] = useState(true)
  const [opacity, setOpacity] = useState(0.85)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [cursorCoords, setCursorCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null })
  const [selected, setSelected] = useState<{ key: string; properties: Properties } | null>(null)
  const [ready, setReady] = useState(false)
  const [issue, setIssue] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const year = selection.year ?? 0, month = selection.month ?? 1, sensor = selection.sensor
  const selectionKey = JSON.stringify(selection)
  const filteredGeoJson = useMemo(() => filterCells(data, selection), [data, selection])
  const selectedCell = selected?.key === selectionKey && filteredGeoJson.features.some(f => f.properties === selected.properties) ? selected.properties : null
  const percentileBreaks = useMemo(() => {
    const values = filteredGeoJson.features.map(f => f.properties.n_detections)
    return { q25: calculatePercentile(values, .25), q50: calculatePercentile(values, .5), q75: calculatePercentile(values, .75) }
  }, [filteredGeoJson])
  const stats = useMemo(() => ({ count: filteredGeoJson.features.length,
    totalDetections: filteredGeoJson.features.reduce((sum, f) => sum + f.properties.n_detections, 0),
    maxCell: filteredGeoJson.features.reduce((max, f) => Math.max(max, f.properties.n_detections), 0),
  }), [filteredGeoJson])
  const latest = useRef({ data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey })
  useEffect(() => { latest.current = { data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey } }, [data, filteredGeoJson, percentileBreaks, opacity, baseMap, overlays, selectionKey])

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
        return latest.current.filteredGeoJson.features.find(feature => feature.properties.cell_id === id)
      }
      map.on('mousemove', 'celdas-fill', event => {
        const feature = pick(event)
        if (feature) { map.getCanvas().style.cursor = 'pointer'; popup?.setLngLat(event.lngLat).setDOMContent(cellPopup(feature.properties)).addTo(map) }
      })
      map.on('mousemove', event => setCursorCoords({ lat: Number(event.lngLat.lat.toFixed(3)), lon: Number(event.lngLat.lng.toFixed(3)) }))
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
  const handleFilterChange = (nextYear: number, nextMonth: number, nextSensor: Sensor) => onSelectionChange({ ...selection, year: nextYear, month: nextMonth, sensor: nextSensor })
  const resetView = () => { const bounds = cellsBounds(data); if (bounds) mapRef.current?.fitBounds(bounds, { padding: 45, maxZoom: 11 }) }
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement === rootRef.current) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen() }
    catch { setIssue('El navegador no permite pantalla completa.') }
  }
  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('demo')
    for (const [key, value] of Object.entries({ view: 'map', mapRegion: selection.region, periodYear: String(year), periodMonth: String(month), sensor })) url.searchParams.set(key, value)
    try { await navigator.clipboard.writeText(url.toString()); setShareMessage('Enlace de región, período y sensor copiado.') }
    catch { setShareMessage(`Copia este enlace: ${url.toString()}`) }
  }
  return (
    <div ref={rootRef} className="fire-map"
      style={{
        width: '100%',
        height: isFullScreen ? '100vh' : 'min(80vh, 900px)',
        minHeight: '620px',
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ================================================================
          CABECERA
      ================================================================ */}

      {(
        <header
          style={{
            height: '54px',
            background:
              'linear-gradient(90deg, #14213D 0%, #16865B 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            zIndex: 10,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: '#FF623D',
                color: '#fff',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '4px',
                letterSpacing: '0.5px',
                fontSize: '14px',
              }}
            >
              ALLPANINA
            </div>

            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '16px',
                  letterSpacing: '0.3px',
                }}
              >
                MAPA MODIS / VIIRS
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: '#FFF3DF',
                  opacity: 0.9,
                }}
              >
                Conteos de detecciones, no incendios confirmados
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#FFC247',
              color: '#14213D',
              padding: '5px 12px',
              borderRadius: '4px',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '0.4px',
            }}
          >
            DATOS DEMO — NO SON OBSERVACIONES REALES
          </div>
        </header>
      )}

      {/* ================================================================
          COORDENADAS EN VIVO
      ================================================================ */}

      {!isFullScreen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 33, 61, 0.88)',
            color: '#FFF3DF',
            padding: '6px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            zIndex: 5,
            display: 'flex',
            gap: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            border: '1px solid rgba(25, 167, 160, 0.5)',
          }}
        >
          <span>
            Lat: {cursorCoords.lat ?? '—'}° · Lon: {cursorCoords.lon ?? '—'}°
          </span>

          <span>|</span>

          <span>
            Periodo: {MONTHS[month - 1]} {year}
          </span>

          <span>|</span>

          <span>
            Sensor:{' '}
            {sensor === 'MODIS'
              ? 'MODIS'
              : 'VIIRS'}
          </span>
        </div>
      )}

      {/* ================================================================
          MAPA
      ================================================================ */}

      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '54px',
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 54px)',
        }}
      />

      {/* ================================================================
          PANEL DE CONTROL
      ================================================================ */}

      {showMenu && (
        <aside
          style={{
            position: 'absolute',
            top: '70px',
            right: '16px',
            width: 'min(325px, calc(100% - 32px))',
            background: 'rgba(20, 33, 61, 0.94)',
            color: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            border: '1px solid #19A7A0',
            zIndex: 6,
            maxHeight: 'calc(100% - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div
            style={{
              background: '#19A7A0',
              color: '#14213D',
              padding: '10px 14px',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>CONTROL DE OBSERVACIONES</span>

            <span
              style={{
                fontSize: '11px',
                background: '#14213D',
                color: '#FFF3DF',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              CRS: WGS84
            </span>
          </div>

          <div
            style={{
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '13px',
              fontSize: '13px',
            }}
          >
            {/* ==========================================================
                FONDO CARTOGRÁFICO
            ========================================================== */}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 800,
                  marginBottom: '7px',
                  textTransform: 'uppercase',
                }}
              >
                Fondo cartográfico
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '7px',
                }}
              >
                {BASEMAP_OPTIONS.map((option) => {
                  const active = baseMap === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setBaseMap(option.id)}
                      style={{
                        minHeight: '54px',
                        padding: '7px 8px',
                        textAlign: 'left',
                        borderRadius: '6px',
                        border: active
                          ? '2px solid #FFC247'
                          : '1px solid #475569',
                        background: active
                          ? '#16865B'
                          : '#0f172a',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {active ? '✓ ' : ''}
                        {option.label}
                      </span>

                      <span
                        style={{
                          display: 'block',
                          marginTop: '3px',
                          fontSize: '10px',
                          color: active
                            ? '#FFF3DF'
                            : '#94a3b8',
                        }}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '6px',
                  color: '#94a3b8',
                  fontSize: '10px',
                  lineHeight: 1.35,
                }}
              >
                Cambia únicamente el fondo. Las celdas, filtros, zoom y selección se conservan.
              </div>
            </div>

            {/* ==========================================================
                OVERLAYS
            ========================================================== */}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 800,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                OVERLAYS (4)
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <label style={checkLabelStyle}>
                  <input
                    type="checkbox"
                    checked={overlays.graticule}
                    onChange={(event) =>
                      setOverlays((prev) => ({
                        ...prev,
                        graticule: event.target.checked,
                      }))
                    }
                  />

                  <span>
                    <strong>Latitude-Longitude Lines</strong>

                    <small
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '10px',
                      }}
                    >
                      Cuadrícula dinámica de paralelos y meridianos según el zoom.
                    </small>
                  </span>
                </label>

                <label style={checkLabelStyle}>
                  <input
                    type="checkbox"
                    checked={overlays.basic}
                    onChange={(event) =>
                      setOverlays((prev) => ({
                        ...prev,
                        basic: event.target.checked,
                      }))
                    }
                  />

                  <span>
                    <strong>
                      Coastlines / Borders / Roads - BASIC
                    </strong>

                    <small
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '10px',
                      }}
                    >
                      Costas, ríos, límites departamentales y red vial principal.
                    </small>
                  </span>
                </label>

                <label style={checkLabelStyle}>
                  <input
                    type="checkbox"
                    checked={overlays.detailed}
                    onChange={(event) =>
                      setOverlays((prev) => ({
                        ...prev,
                        detailed: event.target.checked,
                      }))
                    }
                  />

                  <span>
                    <strong>
                      Borders / Roads - DETAILED
                    </strong>

                    <small
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '10px',
                      }}
                    >
                      Límites distritales, centros poblados, ríos y vías secundarias.
                    </small>
                  </span>
                </label>

                <label style={checkLabelStyle}>
                  <input
                    type="checkbox"
                    checked={overlays.protectedAreas}
                    onChange={(event) =>
                      setOverlays((prev) => ({
                        ...prev,
                        protectedAreas: event.target.checked,
                      }))
                    }
                  />

                  <span>
                    <strong>Protected Areas - UCAYALI</strong>

                    <small
                      style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '10px',
                      }}
                    >
                      Áreas Naturales Protegidas del ámbito del piloto Ucayali (MINAM).
                    </small>
                  </span>
                </label>
              </div>

              <div
                style={{
                  marginTop: '7px',
                  color: '#94a3b8',
                  fontSize: '10px',
                  lineHeight: 1.4,
                }}
              >
                Las capas se superponen al fondo sin reemplazar las celdas de observación.
              </div>
            </div>

            {/* ==========================================================
                PERIODO MENSUAL
            ========================================================== */}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 700,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                1. Periodo Mensual
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                <select aria-label="Año del mapa"
                  value={year}
                  onChange={(event) =>
                    handleFilterChange(
                      Number(event.target.value),
                      month,
                      sensor,
                    )
                  }
                  style={{
                    padding: '7px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid #334155',
                  }}
                >
                  {availableYears.map(value => <option key={value} value={value}>Año {value}</option>)}
                </select>

                <select aria-label="Mes del mapa"
                  value={month}
                  onChange={(event) =>
                    handleFilterChange(
                      year,
                      Number(event.target.value),
                      sensor,
                    )
                  }
                  style={{
                    padding: '7px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    color: '#fff',
                    border: '1px solid #334155',
                  }}
                >
                  {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </div>
            </div>

            {/* ==========================================================
                SENSOR
            ========================================================== */}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 700,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                2. Instrumento Satelital
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                }}
              >
                <button
                  onClick={() =>
                    handleFilterChange(
                      year,
                      month,
                      'MODIS',
                    )
                  }
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border:
                      sensor === 'MODIS'
                        ? '2px solid #FFC247'
                        : '1px solid #334155',
                    background:
                      sensor === 'MODIS'
                        ? '#16865B'
                        : '#0f172a',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  MODIS
                </button>

                <button
                  onClick={() =>
                    handleFilterChange(
                      year,
                      month,
                      'VIIRS',
                    )
                  }
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border:
                      sensor === 'VIIRS'
                        ? '2px solid #FFC247'
                        : '1px solid #334155',
                    background:
                      sensor === 'VIIRS'
                        ? '#16865B'
                        : '#0f172a',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  VIIRS
                </button>
              </div>
            </div>

            {/* ==========================================================
                OPACIDAD
            ========================================================== */}

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  marginBottom: '4px',
                }}
              >
                <span>Opacidad de celdas</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>

              <input
                type="range" aria-label="Opacidad de celdas"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) =>
                  setOpacity(Number(event.target.value))
                }
                style={{
                  width: '100%',
                  accentColor: '#19A7A0',
                }}
              />
            </div>

            {/* ==========================================================
                RESUMEN OBSERVADO
            ========================================================== */}

            <div
              style={{
                background: '#0f172a',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#FFC247',
                  fontWeight: 700,
                  marginBottom: '6px',
                }}
              >
                RESUMEN OBSERVADO ({MONTHS[month - 1]?.toUpperCase()} {year})
              </div>

              {stats.count === 0 ? (
                <div
                  style={{
                    color: '#FF623D',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  ⚠️ Sin registros para este período y sensor. Ausencia de filas no equivale a cero.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    textAlign: 'center',
                    gap: '4px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                      }}
                    >
                      {stats.count}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}
                    >
                      Celdas con registro
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#FFC247',
                      }}
                    >
                      {stats.totalDetections}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}
                    >
                      Suma de detecciones
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#FF623D',
                      }}
                    >
                      {stats.maxCell}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                      }}
                    >
                      Máx. en celda
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==========================================================
                LEYENDA PERCENTILES
            ========================================================== */}

            <div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 700,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                3. Intensidad de detección — Percentiles
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '7px',
                }}
              >
                {[
                  {
                    label: 'Bajo',
                    range: `Hasta P25 · ≤ ${percentileBreaks.q25.toFixed(1)}`,
                    color: '#FEE2E2',
                  },
                  {
                    label: 'Medio-bajo',
                    range: `P25–P50 · ≤ ${percentileBreaks.q50.toFixed(1)}`,
                    color: '#FCA5A5',
                  },
                  {
                    label: 'Medio-alto',
                    range: `P50–P75 · ≤ ${percentileBreaks.q75.toFixed(1)}`,
                    color: '#EF4444',
                  },
                  {
                    label: 'Alto',
                    range: `Superior a P75 · > ${percentileBreaks.q75.toFixed(1)}`,
                    color: '#991B1B',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '17px',
                        background: item.color,
                        border: '1px solid rgba(255,255,255,0.45)',
                        borderRadius: '3px',
                        flexShrink: 0,
                      }}
                    />

                    <span
                      style={{
                        flex: 1,
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </span>

                    <span
                      style={{
                        color: '#CBD5E1',
                        fontSize: '10px',
                      }}
                    >
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>

              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '10px',
                  marginTop: '8px',
                  lineHeight: 1.4,
                }}
              >
                Los umbrales se recalculan según el conjunto de celdas del periodo y sensor seleccionados.
              </p>
            </div>

            {/* ==========================================================
                INSPECTOR DE CELDA
            ========================================================== */}

            <div
              style={{
                background: '#0f172a',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #19A7A0',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#19A7A0',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                INSPECTOR DE CELDA (CLIC)
              </div>

              {selectedCell ? (
                <div
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  <div>
                    ID Malla: <code>{selectedCell.cell_id}</code>
                  </div>
                  <div>Período: {selectedCell.year}-{String(selectedCell.month).padStart(2, '0')} · Sensor: {selectedCell.sensor}</div>

                  <div>
                    Región: <b>{selection.region}</b>
                    {' · '}
                    Conteo observado según contrato
                  </div>

                  <div>
                    Valor observado:{' '}
                    <b style={{ color: '#FFC247' }}>
                      {selectedCell.n_detections} detecciones
                    </b>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                >
                  Pasa el mouse o haz clic sobre cualquier celda del mapa.
                </div>
              )}
            </div>

            {/* NOTA METODOLÓGICA */}
            <div
              style={{
                fontSize: '11px',
                color: '#cbd5e1',
                background: 'rgba(255, 98, 61, 0.15)',
                borderLeft: '3px solid #FF623D',
                padding: '6px 8px',
              }}
            >
              <b>Regla de precisión:</b> Solo observaciones agregadas por celda. No aplica el factor regional B1 a celdas individuales.
            </div>
          </div>
        </aside>
      )}

      <div className="map-toolbar">
        <button type="button" onClick={resetView}>Restablecer vista</button>
        <button type="button" onClick={() => setShowMenu(!showMenu)} aria-pressed={showMenu}>Controles</button>
        <button type="button" onClick={() => void toggleFullscreen()}>Pantalla completa</button>
        <button type="button" onClick={() => void copyLink()}>Copiar enlace</button>
        <label>Celda (teclado)
          <select aria-label="Seleccionar celda del mapa" value={selectedCell?.cell_id ?? ''} onChange={event => {
            const feature = filteredGeoJson.features.find(f => f.properties.cell_id === event.target.value)
            setSelected(feature ? { key: selectionKey, properties: feature.properties } : null)
          }}><option value="">Elegir celda</option>{filteredGeoJson.features.map(f => <option key={f.properties.cell_id} value={f.properties.cell_id}>{f.properties.cell_id}: {f.properties.n_detections} detecciones</option>)}</select>
        </label>
      </div>
      {shareMessage && <p className="map-share-message" role="status">{shareMessage}</p>}
      {!ready && !issue && <p className="map-loading" role="status">Cargando mapa WebGL y recursos cartográficos…</p>}
      {issue && <div className="map-issue" role="alert">{issue}<button type="button" onClick={() => { setReady(false); setIssue(''); setAttempt(attempt + 1) }}>Reintentar mapa</button></div>}
    </div>
  )
}
