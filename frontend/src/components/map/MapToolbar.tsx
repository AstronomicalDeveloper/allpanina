import { actionButtonStyle, actionIconStyle } from '../../constants/styles';
import type { SensorGroup, ToolPanel } from '../../types/fireMap';

interface MapToolbarProps {
  year: number;
  month: number;
  sensor: SensorGroup;
  activeToolPanel: ToolPanel;
  simulateCorruptFile: boolean;
  onResetView: () => void;
  onFilterChange: (y: number, m: number, s: SensorGroup) => void;
  onOpenCapture: () => void;
  onOpenShare: () => void;
  onToggleViewPanel: () => void;
  onToggleCorrupt: () => void;
}

export function MapToolbar(p: MapToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px',
        maxWidth: 'calc(100vw - 20px)', background: 'rgba(20, 33, 61, 0.94)',
        padding: '7px 9px', borderRadius: '9px', border: '1px solid #334155',
        zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      <button type="button" onClick={p.onResetView} title="Centrar región piloto" style={actionButtonStyle}>
        <span style={actionIconStyle}>⌖</span><span>CENTRAR</span>
      </button>
      <button type="button" onClick={() => p.onFilterChange(p.year, p.month, p.sensor === 'MODIS_TA' ? 'VIIRS_SNPP' : 'MODIS_TA')} title="Alternar MODIS / VIIRS" style={actionButtonStyle}>
        <span style={actionIconStyle}>⇄</span><span>SENSOR</span>
      </button>
      <button type="button" onClick={p.onOpenCapture} title="Capturar mapa" style={{ ...actionButtonStyle, background: p.activeToolPanel === 'capture' ? '#E66A16' : '#16405A' }}>
        <span style={actionIconStyle}>▣</span><span>CAPTURE</span>
      </button>
      <button type="button" onClick={p.onOpenShare} title="Compartir vista" style={{ ...actionButtonStyle, background: p.activeToolPanel === 'share' ? '#E66A16' : '#16405A' }}>
        <span style={actionIconStyle}>↗</span><span>SHARE</span>
      </button>
      <button type="button" onClick={p.onToggleViewPanel} title="Cambiar modo de visualización" style={{ ...actionButtonStyle, background: p.activeToolPanel === 'view' ? '#E66A16' : '#16405A' }}>
        <span style={actionIconStyle}>▣</span><span>VIEW MODE</span>
      </button>
      <button type="button" onClick={p.onToggleCorrupt} title={p.simulateCorruptFile ? 'Restaurar GeoJSON' : 'Probar GeoJSON inválido'} style={{ ...actionButtonStyle, background: p.simulateCorruptFile ? '#991B1B' : '#334155' }}>
        <span style={actionIconStyle}>⚠</span><span>GEOJSON</span>
      </button>
    </div>
  );
}
