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

export function FireMapTest(props: FireMapProps = {}) {
  const {
    mapContainer, baseMap, setBaseMap, dynamicImagery, setDynamicImagery,
    year, month, day, sensor, activeToolPanel, setActiveToolPanel, isFullScreen,
    overlays, setOverlays, showMenu, setShowMenu,
    captureFormat, setCaptureFormat, captureHeader, setCaptureHeader,
    captureTimestamp, setCaptureTimestamp, captureScalebar, setCaptureScalebar,
    captureMessage, setCaptureMessage, isCapturing,
    shareUrl, shareMessage, opacity, setOpacity,
    selectedCell, cursorCoords, simulateCorruptFile, setSimulateCorruptFile,
    validatedSource, percentileBreaks, stats,
    handleFilterChange, resetView, getShareUrl,
    openSharePanel, handleCopyShareUrl, handleSocialShare,
    handleCapture, toggleFullScreen,
  } = useFireMap(props);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      {!isFullScreen && (
        <MapHeader cursorCoords={cursorCoords} day={day} month={month} year={year} sensor={sensor} />
      )}

      <div
        ref={mapContainer}
        style={{ position: 'absolute', left: 0, right: 0, top: isFullScreen ? 0 : '54px', bottom: 0, width: '100%', height: isFullScreen ? '100vh' : 'calc(100vh - 54px)' }}
      />

      {showMenu && (
        <ControlSidebar
          isFullScreen={isFullScreen} validatedSource={validatedSource}
          baseMap={baseMap} setBaseMap={setBaseMap}
          dynamicImagery={dynamicImagery} setDynamicImagery={setDynamicImagery}
          overlays={overlays} setOverlays={setOverlays}
          year={year} month={month} day={day} sensor={sensor} onFilterChange={handleFilterChange}
          opacity={opacity} setOpacity={setOpacity}
          stats={stats} percentileBreaks={percentileBreaks} selectedCell={selectedCell}
        />
      )}

      <MapToolbar
        year={year} month={month} sensor={sensor}
        activeToolPanel={activeToolPanel} simulateCorruptFile={simulateCorruptFile}
        onResetView={resetView} onFilterChange={(y, m, s) => handleFilterChange(y, m, s, day)}
        onOpenCapture={() => { setCaptureMessage(''); setActiveToolPanel('capture'); }}
        onOpenShare={openSharePanel}
        onToggleViewPanel={() => setActiveToolPanel(activeToolPanel === 'view' ? null : 'view')}
        onToggleCorrupt={() => setSimulateCorruptFile((prev) => !prev)}
      />

      <ToolPanels
        activeToolPanel={activeToolPanel} setActiveToolPanel={setActiveToolPanel}
        captureFormat={captureFormat} setCaptureFormat={setCaptureFormat}
        captureHeader={captureHeader} setCaptureHeader={setCaptureHeader}
        captureTimestamp={captureTimestamp} setCaptureTimestamp={setCaptureTimestamp}
        captureScalebar={captureScalebar} setCaptureScalebar={setCaptureScalebar}
        captureMessage={captureMessage} isCapturing={isCapturing} onCapture={() => void handleCapture()}
        shareUrl={shareUrl} getShareUrl={getShareUrl} shareMessage={shareMessage}
        onCopyShareUrl={() => void handleCopyShareUrl()} onSocialShare={handleSocialShare}
        isFullScreen={isFullScreen} onToggleFullScreen={() => void toggleFullScreen()}
        showMenu={showMenu} setShowMenu={setShowMenu}
      />
    </div>
  );
}
