import 'maplibre-gl/dist/maplibre-gl.css';
import { ControlSidebar } from './components/map/ControlSidebar';
import { MapHeader } from './components/map/MapHeader';
import { MapToolbar } from './components/map/MapToolbar';
import { ToolPanels } from './components/map/ToolPanels';
import { useFireMap } from './hooks/useFireMap';
import type { FireMapProps } from './types/fireMap';

export type {
  BaseMapId,
  CellFeature,
  CellFeatureCollection,
  CellProperties,
  DynamicImageryId,
  FireMapProps,
  SensorGroup,
} from './types/fireMap';
export { validateGeoJson } from './utils/geo';

export function FireMapTest(props: FireMapProps = {}) {
  const vm = useFireMap(props);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {!vm.isFullScreen && (
        <MapHeader cursorCoords={vm.cursorCoords} day={vm.day} month={vm.month} year={vm.year} sensor={vm.sensor} />
      )}

      <div
        ref={vm.mapContainer}
        style={{ position: 'absolute', left: 0, right: 0, top: vm.isFullScreen ? 0 : '54px', bottom: 0, width: '100%', height: vm.isFullScreen ? '100vh' : 'calc(100vh - 54px)' }}
      />

      {vm.showMenu && (
        <ControlSidebar
          isFullScreen={vm.isFullScreen} validatedSource={vm.validatedSource}
          baseMap={vm.baseMap} setBaseMap={vm.setBaseMap}
          dynamicImagery={vm.dynamicImagery} setDynamicImagery={vm.setDynamicImagery}
          overlays={vm.overlays} setOverlays={vm.setOverlays}
          year={vm.year} month={vm.month} day={vm.day} sensor={vm.sensor} onFilterChange={vm.handleFilterChange}
          opacity={vm.opacity} setOpacity={vm.setOpacity}
          stats={vm.stats} percentileBreaks={vm.percentileBreaks} selectedCell={vm.selectedCell}
        />
      )}

      <MapToolbar
        year={vm.year} month={vm.month} sensor={vm.sensor}
        activeToolPanel={vm.activeToolPanel} simulateCorruptFile={vm.simulateCorruptFile}
        onResetView={vm.resetView} onFilterChange={(y, m, s) => vm.handleFilterChange(y, m, s, vm.day)}
        onOpenCapture={() => { vm.setCaptureMessage(''); vm.setActiveToolPanel('capture'); }}
        onOpenShare={vm.openSharePanel}
        onToggleViewPanel={() => vm.setActiveToolPanel(vm.activeToolPanel === 'view' ? null : 'view')}
        onToggleCorrupt={() => vm.setSimulateCorruptFile((prev) => !prev)}
      />

      <ToolPanels
        activeToolPanel={vm.activeToolPanel} setActiveToolPanel={vm.setActiveToolPanel}
        captureFormat={vm.captureFormat} setCaptureFormat={vm.setCaptureFormat}
        captureHeader={vm.captureHeader} setCaptureHeader={vm.setCaptureHeader}
        captureTimestamp={vm.captureTimestamp} setCaptureTimestamp={vm.setCaptureTimestamp}
        captureScalebar={vm.captureScalebar} setCaptureScalebar={vm.setCaptureScalebar}
        captureMessage={vm.captureMessage} isCapturing={vm.isCapturing} onCapture={() => void vm.handleCapture()}
        shareUrl={vm.shareUrl} getShareUrl={vm.getShareUrl} shareMessage={vm.shareMessage}
        onCopyShareUrl={() => void vm.handleCopyShareUrl()} onSocialShare={vm.handleSocialShare}
        isFullScreen={vm.isFullScreen} onToggleFullScreen={() => void vm.toggleFullScreen()}
        showMenu={vm.showMenu} setShowMenu={vm.setShowMenu}
      />
    </div>
  );
}
