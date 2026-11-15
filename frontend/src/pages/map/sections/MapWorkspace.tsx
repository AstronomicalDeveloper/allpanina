import { useState } from 'react'
import type { CellsData, Manifest } from '../../../types/data'
import type { MapSelection } from '../../../types/selection'
import type { MapYear } from '../../../services/data/mapExploration'
import type { RuntimeLoader } from '../cartography/mapRuntime'
import useJuanMap from '../useJuanMap'
import CartographyPanel from './CartographyPanel'
import ExplorationPanel from './ExplorationPanel'

export default function MapWorkspace({ data, model, selection, years, onChange, unavailable, manifest, demo, runtimeLoader }: {
  data: CellsData; model: MapYear; selection: MapSelection; years: number[]; onChange: (next: MapSelection) => void
  unavailable: boolean; manifest: Manifest; demo: boolean; runtimeLoader?: RuntimeLoader
}) {
  const { rootRef, mapContainer, ...map } = useJuanMap({ data, model, selection, runtimeLoader })
  const [cartography, setCartography] = useState(true)
  const [exploration, setExploration] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [mobileSection, setMobileSection] = useState<'exploration' | 'cartography'>('exploration')
  return <div ref={rootRef} className={`map-workspace${expanded ? ' map-workspace--expanded' : ''}${map.isFullScreen ? ' map-workspace--fullscreen' : ''}`}>
    <div ref={mapContainer} className="map-canvas-v2" aria-label="Mapa interactivo de observaciones" />
    <div className="map-context"><strong>{selection.region}</strong><span>{map.scope === 'year' ? `Año ${map.year}` : map.periodLabel} · {map.sensor}</span>{demo && <b>DATOS DEMO — NO SON OBSERVACIONES REALES</b>}</div>
    <div className="map-sheet">
      <button className="map-sheet-handle" aria-expanded={expanded} aria-controls="map-sheet-content" onClick={() => setExpanded(!expanded)}><span><strong>Explorar observaciones</strong><small>{map.scope === 'year' ? `Año ${map.year}` : map.periodLabel} · {map.sensor}{map.scope === 'year' && !unavailable && map.usableMonths < 12 ? ' · Año parcial' : ''}</small></span><svg className="map-sheet-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6" /></svg></button>
      <div id="map-sheet-content" className="map-sheet-content">
        <div className="map-mobile-switch map-segment"><button aria-pressed={mobileSection === 'exploration'} onClick={() => setMobileSection('exploration')}>Exploración</button><button aria-pressed={mobileSection === 'cartography'} onClick={() => setMobileSection('cartography')}>Cartografía</button></div>
        <section className={`map-panel map-panel--left${mobileSection !== 'cartography' ? ' map-panel--mobile-hidden' : ''}`}>
          <button className="map-panel-toggle" aria-expanded={cartography} aria-controls="map-cartography-content" onClick={() => setCartography(!cartography)}><span>Cartografía</span><span aria-hidden="true">{cartography ? '−' : '+'}</span></button>
          <div id="map-cartography-content" className="map-panel-scroll" hidden={!cartography}><CartographyPanel map={map} /></div>
        </section>
        <section className={`map-panel map-panel--right${mobileSection !== 'exploration' ? ' map-panel--mobile-hidden' : ''}`}>
          <button className="map-panel-toggle" aria-expanded={exploration} aria-controls="map-exploration-content" onClick={() => setExploration(!exploration)}><span>Explorar observaciones</span><span aria-hidden="true">{exploration ? '−' : '+'}</span></button>
          <div id="map-exploration-content" className="map-panel-scroll" hidden={!exploration}><ExplorationPanel map={map} selection={selection} years={years} onChange={onChange} unavailable={unavailable} />
            <details className="map-provenance"><summary>Procedencia de los datos</summary><p>{manifest.producto}</p><p>Publicación: {manifest.generated_at}</p><p>GeoJSON WGS84 · {selection.region}</p></details>
          </div>
        </section>
      </div>
    </div>
    <div className="map-view-tools" aria-label="Controles de vista"><button onClick={map.resetView} title="Encuadrar las observaciones">Encuadrar</button><button onClick={() => void map.toggleFullscreen()}>{map.isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</button><button onClick={() => void map.copyLink()}>Copiar enlace</button></div>
    <span className="map-coordinates">Lat {map.cursorCoords.lat ?? '—'}° · Lon {map.cursorCoords.lon ?? '—'}°</span>
    {map.shareMessage && <div className="map-feedback map-feedback--share"><span role="status">{map.shareMessage}</span><button className="map-feedback-close" aria-label="Cerrar aviso de enlace" onClick={map.dismissShare}>×</button></div>}
    {!map.ready && !map.issue && <p className="map-feedback" role="status">Cargando cartografía…</p>}
    {map.issue && <div className="map-feedback map-feedback--error" role="alert">{map.issue}<button onClick={map.retry}>Reintentar mapa</button></div>}
  </div>
}
