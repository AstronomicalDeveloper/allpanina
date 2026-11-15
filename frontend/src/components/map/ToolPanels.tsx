import {
  checkLabelStyle, fieldLabelStyle, panelCloseStyle, primaryButtonStyle,
  secondaryButtonStyle, selectStyle, socialButtonStyle, statusMessageStyle,
  toolPanelHeaderStyle, toolPanelStyle,
} from '../../constants/styles';
import type { CaptureFormat, ToolPanel } from '../../types/fireMap';

interface ToolPanelsProps {
  activeToolPanel: ToolPanel;
  setActiveToolPanel: (p: ToolPanel) => void;
  captureFormat: CaptureFormat;
  setCaptureFormat: (f: CaptureFormat) => void;
  captureHeader: boolean;
  setCaptureHeader: (v: boolean) => void;
  captureTimestamp: boolean;
  setCaptureTimestamp: (v: boolean) => void;
  captureScalebar: boolean;
  setCaptureScalebar: (v: boolean) => void;
  captureMessage: string;
  isCapturing: boolean;
  onCapture: () => void;
  shareUrl: string;
  getShareUrl: () => string;
  shareMessage: string;
  onCopyShareUrl: () => void;
  onSocialShare: (p: 'facebook' | 'x' | 'reddit' | 'email') => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
}

export function ToolPanels(p: ToolPanelsProps) {
  return (
    <>
      {p.activeToolPanel === 'capture' && (
        <div role="dialog" aria-modal="true" aria-label="Capturar mapa" style={toolPanelStyle}>
          <div style={toolPanelHeaderStyle}>
            <strong>CAPTURE</strong>
            <button type="button" onClick={() => p.setActiveToolPanel(null)} style={panelCloseStyle} aria-label="Cerrar">×</button>
          </div>
          <div style={{ padding: '14px', fontSize: '12px', color: '#DCE7F2' }}>
            <p style={{ margin: '0 0 12px' }}>Descargar la vista actual del mapa como archivo.</p>
            <label style={fieldLabelStyle}>
              Formato de exportación
              <select value={p.captureFormat} onChange={(e) => p.setCaptureFormat(e.target.value as CaptureFormat)} style={selectStyle}>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
              <label style={checkLabelStyle}><input type="checkbox" checked={p.captureHeader} onChange={(e) => p.setCaptureHeader(e.target.checked)} />Encabezado Allpanina</label>
              <label style={checkLabelStyle}><input type="checkbox" checked={p.captureTimestamp} onChange={(e) => p.setCaptureTimestamp(e.target.checked)} />Fecha y hora</label>
              <label style={checkLabelStyle}><input type="checkbox" checked={p.captureScalebar} onChange={(e) => p.setCaptureScalebar(e.target.checked)} />Escala gráfica</label>
            </div>
            <p style={{ margin: '12px 0 0', color: '#94A3B8', fontSize: '10px', lineHeight: 1.4 }}>
              {p.captureFormat === 'pdf'
                ? 'El PDF guarda el mapa completo con el encabezado, fecha y escala seleccionados.'
                : 'La imagen incluye el mapa y sus capas. Los controles HTML del visor no se dibujan dentro de la captura.'}
            </p>
            {p.captureMessage && <p role="status" style={statusMessageStyle}>{p.captureMessage}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button type="button" onClick={() => p.setActiveToolPanel(null)} style={secondaryButtonStyle}>Cancelar</button>
              <button type="button" onClick={p.onCapture} disabled={p.isCapturing} style={{ ...primaryButtonStyle, opacity: p.isCapturing ? 0.65 : 1, cursor: p.isCapturing ? 'wait' : 'pointer' }}>
                {p.isCapturing ? 'Procesando…' : '⇩ Descargar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {p.activeToolPanel === 'share' && (
        <div role="dialog" aria-modal="true" aria-label="Compartir mapa" style={toolPanelStyle}>
          <div style={toolPanelHeaderStyle}>
            <strong>SHARE URL</strong>
            <button type="button" onClick={() => p.setActiveToolPanel(null)} style={panelCloseStyle} aria-label="Cerrar">×</button>
          </div>
          <div style={{ padding: '14px', color: '#DCE7F2' }}>
            <label style={fieldLabelStyle}>
              Enlace de esta vista
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <input readOnly value={p.shareUrl || p.getShareUrl()} onFocus={(e) => e.currentTarget.select()} style={{ ...selectStyle, minWidth: 0, flex: 1, background: '#FFFFFF', color: '#14213D' }} />
                <button type="button" onClick={p.onCopyShareUrl} style={primaryButtonStyle}>Copiar</button>
              </div>
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '18px' }}>
              <button type="button" onClick={() => p.onSocialShare('facebook')} style={socialButtonStyle} title="Compartir en Facebook">f</button>
              <button type="button" onClick={() => p.onSocialShare('x')} style={socialButtonStyle} title="Compartir en X">𝕏</button>
              <button type="button" onClick={() => p.onSocialShare('reddit')} style={socialButtonStyle} title="Compartir en Reddit">r/</button>
              <button type="button" onClick={() => p.onSocialShare('email')} style={socialButtonStyle} title="Compartir por correo">✉</button>
            </div>
            {p.shareMessage && <p role="status" style={statusMessageStyle}>{p.shareMessage}</p>}
            <p style={{ color: '#94A3B8', fontSize: '10px', lineHeight: 1.4, margin: '14px 0 0' }}>
              El enlace conserva el centro, zoom, fondo cartográfico, periodo y sensor. Para que otras personas lo abran, publica primero la aplicación en una dirección accesible.
            </p>
          </div>
        </div>
      )}

      {p.activeToolPanel === 'view' && (
        <div role="dialog" aria-modal="true" aria-label="Modo de vista" style={{ ...toolPanelStyle, width: 'min(360px, calc(100vw - 28px))' }}>
          <div style={toolPanelHeaderStyle}>
            <strong>VIEW MODE</strong>
            <button type="button" onClick={() => p.setActiveToolPanel(null)} style={panelCloseStyle} aria-label="Cerrar">×</button>
          </div>
          <div style={{ padding: '12px', color: '#DCE7F2', display: 'grid', gap: '13px' }}>
            <button
              type="button" onClick={p.onToggleFullScreen}
              style={{ display: 'flex', alignItems: 'center', gap: '13px', width: '100%', padding: '14px', textAlign: 'left', background: '#16405A', border: '1px solid #19A7A0', borderRadius: '5px', color: '#FFFFFF', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '25px' }}>⛶</span>
              <span>
                <strong style={{ color: '#FFC247', fontSize: '13px' }}>{p.isFullScreen ? 'EXIT FULL' : 'FULL'}</strong>
                <small style={{ display: 'block', color: '#CBD5E1', fontSize: '10px', marginTop: '4px' }}>
                  {p.isFullScreen
                    ? 'Salir de pantalla completa (también puedes pulsar ESC).'
                    : 'Abrir el visor en pantalla completa. La interfaz del navegador se oculta mientras el navegador lo permita.'}
                </small>
              </span>
            </button>
            <label style={checkLabelStyle}>
              <input type="checkbox" checked={p.showMenu} onChange={(e) => p.setShowMenu(e.target.checked)} />
              MENU — Mostrar panel de controles
            </label>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '10px', lineHeight: 1.4 }}>
              La cuadrícula de coordenadas se activa desde OVERLAYS → Latitude-Longitude Lines. No existe un interruptor IDENTIFY separado.
            </p>
          </div>
        </div>
      )}

      {p.isFullScreen && (
        <button type="button" onClick={() => p.setActiveToolPanel('view')} title="Opciones de pantalla completa" style={{ ...primaryButtonStyle, position: 'absolute', top: '12px', left: '12px', zIndex: 21 }}>
          VIEW MODE
        </button>
      )}
    </>
  );
}
