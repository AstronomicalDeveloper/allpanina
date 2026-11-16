import { useEffect, useRef, useState } from 'react'
import type { CellsData, Manifest, MonthlyRecord } from '../../../types/data'
import type { MapSelection } from '../../../types/selection'
import type { MapYear } from '../../../services/data/mapExploration'
import type { RuntimeLoader } from '../cartography/mapRuntime'
import { regionalSummary } from '../../../services/data/regionalSummary'
import { Tabs } from '../../../ui/Tabs'
import useJuanMap from '../useJuanMap'
import CartographyPanel from './CartographyPanel'
import ExplorationPanel from './ExplorationPanel'
import InformationPanel from './InformationPanel'
import MapLegend from './MapLegend'
import TechnicalDetail from './MapTechnicalDetail'

type Tab = 'explore' | 'layers' | 'information'
type Sheet = 'peek' | 'half' | 'full'
const TABS: { value: Tab; label: string }[] = [{ value: 'explore', label: 'Explore' }, { value: 'layers', label: 'Layers' }, { value: 'information', label: 'Information' }]
const NEXT_SHEET: Record<Sheet, Sheet> = { peek: 'half', half: 'full', full: 'peek' }
const SHEET_LABEL: Record<Sheet, string> = { peek: 'minimized', half: 'half height', full: 'full height' }

/**
 * Map page layout (F5b, inspired by FIRMS): the map fills the space; a collapsible left panel with the
 * Explore, Layers and Information tabs; a timeline along the bottom; a floating legend. On small
 * screens the panel becomes a bottom sheet with three heights. All panels stay in the DOM (hidden),
 * so their state (inspector, selections) survives switching tabs.
 */
export default function MapWorkspace({ data, model, selection, years, onChange, unavailable, manifest, demo, runtimeLoader, national = false, records = [], regionName }: {
  regionName: string; national?: boolean; records?: MonthlyRecord[]; data: CellsData; model: MapYear; selection: MapSelection; years: number[]; onChange: (next: MapSelection) => void
  unavailable: boolean; manifest: Manifest; demo: boolean; runtimeLoader?: RuntimeLoader
}) {
  const { rootRef, mapContainer, ...map } = useJuanMap({ data, model, selection, runtimeLoader, national })
  const [tab, setTab] = useState<Tab>('explore')
  const [collapsed, setCollapsed] = useState(false)
  const [sheet, setSheet] = useState<Sheet>('peek')
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const toolsButton = useRef<HTMLButtonElement>(null)
  const showButton = useRef<HTMLButtonElement>(null)
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
  const chooseTab = (next: Tab) => { setTab(next); if (sheet === 'peek') setSheet('half') }
  const period = `${map.scope === 'year' ? `Year ${map.year}` : map.periodLabel} · ${map.sensor}${map.scope === 'year' && !unavailable && map.usableMonths < 12 ? ' · Partial year' : ''}`
  const classes = ['map-workspace', collapsed && 'map-workspace--collapsed', `map-workspace--sheet-${sheet}`, map.isFullScreen && 'map-workspace--fullscreen'].filter(Boolean).join(' ')
  return <div ref={rootRef} className={classes}>
    <div ref={mapContainer} className="map-canvas-v2" aria-label="Interactive map of observations" />

    <aside className="map-sidebar" aria-label="Map panel" hidden={collapsed}>
      <button type="button" className="map-sheet-handle" aria-expanded={sheet !== 'peek'} aria-controls="map-sidebar-body"
        aria-label={`Panel: ${SHEET_LABEL[sheet]}. Change size`} onClick={() => setSheet(NEXT_SHEET[sheet])}>
        <span className="map-sheet-grip" aria-hidden="true" />
        <span className="map-sheet-title"><strong>{regionName}</strong><small>{period}</small></span>
      </button>
      <div className="map-sidebar-head">
        <Tabs id="map-panel" options={TABS} value={tab} onChange={chooseTab} label="Map panel" className="map-tabs" />
        <button type="button" className="map-sidebar-collapse" aria-label="Hide panel" title="Hide panel"
          onClick={() => { setCollapsed(true); setTimeout(() => showButton.current?.focus(), 0) }}>
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3 5 8l5 5" /></svg>
        </button>
      </div>
      <div id="map-sidebar-body" className="map-sidebar-body">
        <div id="map-panel-panel-explore" role="tabpanel" aria-labelledby="map-panel-tab-explore" className="map-tab map-tab--explore" hidden={tab !== 'explore'}>
          <ExplorationPanel map={map} selection={selection} years={years} onChange={onChange} unavailable={unavailable} national={national} regional={national ? regionalSummary(records, selection) : undefined} regionName={regionName} />
        </div>
        <div id="map-panel-panel-layers" role="tabpanel" aria-labelledby="map-panel-tab-layers" className="map-tab map-tab--layers" hidden={tab !== 'layers'}>
          <CartographyPanel map={map} />
        </div>
        <div id="map-panel-panel-information" role="tabpanel" aria-labelledby="map-panel-tab-information" className="map-tab map-tab--information" hidden={tab !== 'information'}>
          <InformationPanel map={map} national={national} region={selection.region} regionName={regionName} manifest={manifest} />
        </div>
      </div>
    </aside>
    {collapsed && <button ref={showButton} type="button" className="map-sidebar-show" onClick={() => setCollapsed(false)}>Show panel</button>}

    <div className="map-context"><strong>{regionName}</strong><span>{period}</span>{national && <span>Layer: Peru · 10 km grid</span>}<span className="map-coordinates">Lat {map.cursorCoords.lat ?? '—'}° · Lon {map.cursorCoords.lon ?? '—'}°</span>{demo && <b>DEMO DATA — NOT REAL OBSERVATIONS</b>}</div>

    <div ref={toolsRef} className={`map-view-tools${toolsOpen ? ' map-view-tools--open' : ''}`} aria-label="View controls" onKeyDown={event => {
      if (event.key === 'Escape' && toolsOpen) { setToolsOpen(false); toolsButton.current?.focus() }
    }}>
      <button ref={toolsButton} className="map-tools-toggle" aria-label="Map tools" aria-expanded={toolsOpen} aria-controls="map-view-actions" onClick={() => setToolsOpen(!toolsOpen)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
      <div id="map-view-actions" className="map-view-actions"><button onClick={() => runTool(map.resetView)} title="Zoom to the selected scope">Zoom to scope</button><button onClick={() => runTool(() => void map.toggleFullscreen())}>{map.isFullScreen ? 'Exit full screen' : 'Full screen'}</button><button onClick={() => runTool(() => void map.copyLink())}>Copy link</button><MapLegend map={map} national={national} /></div>
    </div>



    {map.shareMessage && <div className="map-feedback map-feedback--share"><span role="status">{map.shareMessage}</span><button className="map-feedback-close" aria-label="Close link notice" onClick={map.dismissShare}>×</button></div>}
    {map.notice && <div className="map-feedback map-feedback--notice"><span role="status">{map.notice}</span><button className="map-feedback-close" aria-label="Close map notice" onClick={map.dismissNotice}>×</button></div>}
    {!map.ready && !map.issue && <p className="map-feedback" role="status">Loading map…</p>}
    {map.issue && <div className="map-feedback map-feedback--error" role="alert">{map.issue}<button onClick={map.retry}>Retry map</button><TechnicalDetail detail={map.issueDetail} /></div>}
  </div>
}
