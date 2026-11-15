import { useEffect, useRef, useState } from 'react'
import type { CellsData, Manifest, MonthlyRecord } from '../../../types/data'
import type { MapSelection } from '../../../types/selection'
import type { MapYear } from '../../../services/data/mapExploration'
import type { RuntimeLoader } from '../cartography/mapRuntime'
import { regionalSummary } from '../../../services/data/regionalSummary'
import useJuanMap from '../useJuanMap'
import CartographyPanel from './CartographyPanel'
import ExplorationPanel from './ExplorationPanel'
import TechnicalDetail from './MapTechnicalDetail'

export default function MapWorkspace({ data, model, selection, years, onChange, unavailable, manifest, demo, runtimeLoader, national = false, records = [], regionName }: {
  regionName: string; national?: boolean; records?: MonthlyRecord[]; data: CellsData; model: MapYear; selection: MapSelection; years: number[]; onChange: (next: MapSelection) => void
  unavailable: boolean; manifest: Manifest; demo: boolean; runtimeLoader?: RuntimeLoader
}) {
  const { rootRef, mapContainer, ...map } = useJuanMap({ data, model, selection, runtimeLoader, national })
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof window.Node && !toolsRef.current?.contains(event.target)) setToolsOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const runTool = (action: () => void) => {
    action()
    if (toolsOpen) { setToolsOpen(false); toolsButton.current?.focus() }
  }
  const [cartography, setCartography] = useState(true)
  const [exploration, setExploration] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [mobileSection, setMobileSection] = useState<'exploration' | 'cartography'>('exploration')
  return <div ref={rootRef} className={`map-workspace${expanded ? ' map-workspace--expanded' : ''}${map.isFullScreen ? ' map-workspace--fullscreen' : ''}`}>
    <div ref={mapContainer} className="map-canvas-v2" aria-label="Interactive map of observations" />
    <div className="map-context"><strong>{regionName}</strong><span>{map.scope === 'year' ? `Year ${map.year}` : map.periodLabel} · {map.sensor}</span>{national&&<span>Layer: Peru · 10 km grid</span>}{demo && <b>DEMO DATA — NOT REAL OBSERVATIONS</b>}</div>
    <div className="map-sheet">
      <button className="map-sheet-handle" aria-expanded={expanded} aria-controls="map-sheet-content" onClick={() => setExpanded(!expanded)}><span><strong>Explore observations</strong><small>{map.scope === 'year' ? `Year ${map.year}` : map.periodLabel} · {map.sensor}{map.scope === 'year' && !unavailable && map.usableMonths < 12 ? ' · Partial year' : ''}</small></span><svg className="map-sheet-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6" /></svg></button>
      <div id="map-sheet-content" className="map-sheet-content">
        <div className="map-mobile-switch map-segment"><button aria-pressed={mobileSection === 'exploration'} onClick={() => setMobileSection('exploration')}>Explore</button><button aria-pressed={mobileSection === 'cartography'} onClick={() => setMobileSection('cartography')}>Layers</button></div>
        <section className={`map-panel map-panel--left${mobileSection !== 'cartography' ? ' map-panel--mobile-hidden' : ''}`}>
          <button className="map-panel-toggle" aria-expanded={cartography} aria-controls="map-cartography-content" onClick={() => setCartography(!cartography)}><span>Layers</span><span aria-hidden="true">{cartography ? '−' : '+'}</span></button>
          <div id="map-cartography-content" className="map-panel-scroll" hidden={!cartography}><CartographyPanel map={map} national={national} /></div>
        </section>
        <section className={`map-panel map-panel--right${mobileSection !== 'exploration' ? ' map-panel--mobile-hidden' : ''}`}>
          <button className="map-panel-toggle" aria-expanded={exploration} aria-controls="map-exploration-content" onClick={() => setExploration(!exploration)}><span>Explore observations</span><span aria-hidden="true">{exploration ? '−' : '+'}</span></button>
          <div id="map-exploration-content" className="map-panel-scroll" hidden={!exploration}><ExplorationPanel map={map} selection={selection} years={years} onChange={onChange} unavailable={unavailable} national={national} regional={national?regionalSummary(records,selection):undefined} regionName={regionName} />
            <details className="map-provenance"><summary>Data provenance</summary><p>{manifest.producto}</p><p>Published: {manifest.generated_at}</p><p>GeoJSON WGS84 · {national ? 'Peru · national coverage' : regionName}</p></details>
          </div>
        </section>
      </div>
    </div>
    <div ref={toolsRef} className={`map-view-tools${toolsOpen ? ' map-view-tools--open' : ''}`} aria-label="View controls" onKeyDown={event => {
      if (event.key === 'Escape' && toolsOpen) { setToolsOpen(false); toolsButton.current?.focus() }
    }}>
      <button ref={toolsButton} className="map-tools-toggle" aria-label="Map tools" aria-expanded={toolsOpen} aria-controls="map-view-actions" onClick={() => setToolsOpen(!toolsOpen)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
      <div id="map-view-actions" className="map-view-actions"><button onClick={() => runTool(map.resetView)} title="Zoom to the selected scope">Zoom to scope</button><button onClick={() => runTool(() => void map.toggleFullscreen())}>{map.isFullScreen ? 'Exit full screen' : 'Full screen'}</button><button onClick={() => runTool(() => void map.copyLink())}>Copy link</button></div>
    </div>
    <span className="map-coordinates">Lat {map.cursorCoords.lat ?? '—'}° · Lon {map.cursorCoords.lon ?? '—'}°</span>
    {map.shareMessage && <div className="map-feedback map-feedback--share"><span role="status">{map.shareMessage}</span><button className="map-feedback-close" aria-label="Close link notice" onClick={map.dismissShare}>×</button></div>}
    {map.notice && <div className="map-feedback map-feedback--notice"><span role="status">{map.notice}</span><button className="map-feedback-close" aria-label="Close map notice" onClick={map.dismissNotice}>×</button></div>}
    {!map.ready && !map.issue && <p className="map-feedback" role="status">Loading map…</p>}
    {map.issue && <div className="map-feedback map-feedback--error" role="alert">{map.issue}<button onClick={map.retry}>Retry map</button><TechnicalDetail detail={map.issueDetail} /></div>}
  </div>
}
