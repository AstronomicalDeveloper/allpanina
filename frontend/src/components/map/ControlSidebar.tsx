import type { Dispatch, SetStateAction } from 'react';
import {
  BASEMAP_OPTIONS,
  DYNAMIC_IMAGERY_OPTIONS,
  formatDateLabel,
  getDaysInMonth,
  MONTH_NAMES,
} from '../../constants/mapConfig';
import { checkLabelStyle } from '../../constants/styles';
import type {
  BaseMapId,
  CellProperties,
  DynamicImageryId,
  MapStats,
  OverlayState,
  PercentileBreaks,
  SensorGroup,
} from '../../types/fireMap';

interface ControlSidebarProps {
  isFullScreen: boolean;
  validatedSource: { valid: boolean; error: string | null };
  baseMap: BaseMapId;
  setBaseMap: (id: BaseMapId) => void;
  dynamicImagery: DynamicImageryId;
  setDynamicImagery: (id: DynamicImageryId) => void;
  overlays: OverlayState;
  setOverlays: Dispatch<SetStateAction<OverlayState>>;
  year: number;
  month: number;
  day: number;
  sensor: SensorGroup;
  onFilterChange: (y: number, m: number, s: SensorGroup, d?: number) => void;
  opacity: number;
  setOpacity: (val: number) => void;
  stats: MapStats;
  percentileBreaks: PercentileBreaks;
  selectedCell: CellProperties | null;
}

export function ControlSidebar(p: ControlSidebarProps) {
  const daysInSelectedMonth = getDaysInMonth(p.year, p.month);
  const dayOptions = Array.from({ length: daysInSelectedMonth }, (_, idx) => idx + 1);

  return (
    <aside
      style={{
        position: 'absolute', top: p.isFullScreen ? '16px' : '70px', right: '16px', width: '325px',
        background: 'rgba(20, 33, 61, 0.94)', color: '#FFFFFF', borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)', border: '1px solid #19A7A0', zIndex: 6,
        maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', overflowX: 'hidden',
      }}
    >
      <div style={{ background: '#19A7A0', color: '#14213D', padding: '10px 14px', fontWeight: 800, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>CONTROL DE OBSERVACIONES</span>
        <span style={{ fontSize: '11px', background: '#14213D', color: '#FFF3DF', padding: '2px 6px', borderRadius: '4px' }}>CRS: WGS84</span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '13px', fontSize: '13px' }}>
        {!p.validatedSource.valid && (
          <div style={{ background: '#991B1B', color: '#FFF3DF', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
            ❌ Error de archivo GeoJSON: {p.validatedSource.error}
          </div>
        )}

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 800, marginBottom: '7px', textTransform: 'uppercase' }}>Fondo cartográfico</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
            {BASEMAP_OPTIONS.map((option) => {
              const active = p.baseMap === option.id;
              return (
                <button
                  key={option.id} type="button" aria-pressed={active} onClick={() => p.setBaseMap(option.id)}
                  style={{
                    minHeight: '54px', padding: '7px 8px', textAlign: 'left', borderRadius: '6px', cursor: 'pointer', color: '#fff',
                    border: active ? '2px solid #FFC247' : '1px solid #475569', background: active ? '#16865B' : '#0f172a',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 800 }}>{active ? '✓ ' : ''}{option.label}</span>
                  <span style={{ display: 'block', marginTop: '3px', fontSize: '10px', color: active ? '#FFF3DF' : '#94a3b8' }}>{option.description}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '10px', lineHeight: 1.35 }}>
            Cambia únicamente el fondo. Las celdas, filtros, zoom y selección se conservan.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 800, marginBottom: '7px', textTransform: 'uppercase' }}>
            Reflectancia Dinámica Diaria (NASA GIBS)
          </div>
          <select
            value={p.dynamicImagery}
            onChange={(e) => p.setDynamicImagery(e.target.value as DynamicImageryId)}
            style={{ width: '100%', padding: '7px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', fontSize: '12px', fontWeight: 600 }}
          >
            {DYNAMIC_IMAGERY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: '5px', color: '#94a3b8', fontSize: '10px', lineHeight: 1.35 }}>
            {DYNAMIC_IMAGERY_OPTIONS.find((item) => item.id === p.dynamicImagery)?.subtitle} · Fecha sincronizada: {formatDateLabel(p.day, p.month, p.year)}.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>OVERLAYS (4)</div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {([
              ['graticule', 'Latitude-Longitude Lines', 'Cuadrícula dinámica de paralelos y meridianos según el zoom.'],
              ['basic', 'Coastlines / Borders / Roads - BASIC', 'Costas, ríos, límites departamentales y red vial principal.'],
              ['detailed', 'Borders / Roads - DETAILED', 'Límites distritales, centros poblados, ríos y vías secundarias.'],
              ['protectedAreas', 'Protected Areas - PERÚ', 'Áreas Naturales Protegidas del Perú (MINAM).'],
            ] as const).map(([key, title, desc]) => (
              <label key={key} style={checkLabelStyle}>
                <input
                  type="checkbox" checked={p.overlays[key]}
                  onChange={(e) => p.setOverlays((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>
                  <strong>{title}</strong>
                  <small style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>{desc}</small>
                </span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: '7px', color: '#94a3b8', fontSize: '10px', lineHeight: 1.4 }}>
            Las capas se superponen al fondo sin reemplazar las celdas de observación.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>1. Periodo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select
              value={p.year}
              onChange={(e) => p.onFilterChange(Number(e.target.value), p.month, p.sensor, p.day)}
              style={{ padding: '7px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
            </select>
            <select
              value={p.month}
              onChange={(e) => p.onFilterChange(p.year, Number(e.target.value), p.sensor, p.day)}
              style={{ padding: '7px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
            >
              {Object.entries(MONTH_NAMES).map(([m, name]) => (
                <option key={m} value={Number(m)}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: '8px' }}>
            <select
              value={p.day}
              onChange={(e) => p.onFilterChange(p.year, p.month, p.sensor, Number(e.target.value))}
              style={{ width: '100%', padding: '7px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDateLabel(d, p.month, p.year)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>2. Instrumento Satelital</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {([['MODIS_TA', 'MODIS (1 km)'], ['VIIRS_SNPP', 'VIIRS S-NPP (375m)']] as const).map(([id, label]) => (
              <button
                key={id} type="button" onClick={() => p.onFilterChange(p.year, p.month, id, p.day)}
                style={{
                  padding: '8px', borderRadius: '4px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                  border: p.sensor === id ? '2px solid #FFC247' : '1px solid #334155', background: p.sensor === id ? '#16865B' : '#0f172a',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
            <span>Opacidad de celdas</span><span>{Math.round(p.opacity * 100)}%</span>
          </div>
          <input type="range" min="0.2" max="1" step="0.05" value={p.opacity} onChange={(e) => p.setOpacity(Number(e.target.value))} style={{ width: '100%', accentColor: '#19A7A0' }} />
        </div>

        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', color: '#FFC247', fontWeight: 700, marginBottom: '6px' }}>
            RESUMEN OBSERVADO ({formatDateLabel(p.day, p.month, p.year)})
          </div>
          {p.stats.count === 0 ? (
            <div style={{ color: '#FF623D', fontWeight: 600, fontSize: '12px' }}>⚠️ Sin datos observados para esta selección (estado vacío verificado).</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', gap: '4px' }}>
              <div><div style={{ fontSize: '16px', fontWeight: 800 }}>{p.stats.count}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>Celdas activas</div></div>
              <div><div style={{ fontSize: '16px', fontWeight: 800, color: '#FFC247' }}>{p.stats.totalCellDays}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>Suma días-celda</div></div>
              <div><div style={{ fontSize: '16px', fontWeight: 800, color: '#FF623D' }}>{p.stats.maxCell}</div><div style={{ fontSize: '10px', color: '#94a3b8' }}>Máx. en celda</div></div>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>3. Intensidad de detección — Percentiles</div>
          <div style={{ display: 'grid', gap: '7px' }}>
            {[
              { label: 'Bajo', range: `Hasta P25 · ≤ ${p.percentileBreaks.q25.toFixed(1)}`, color: '#FEE2E2' },
              { label: 'Medio-bajo', range: `P25–P50 · ≤ ${p.percentileBreaks.q50.toFixed(1)}`, color: '#FCA5A5' },
              { label: 'Medio-alto', range: `P50–P75 · ≤ ${p.percentileBreaks.q75.toFixed(1)}`, color: '#EF4444' },
              { label: 'Alto', range: `Superior a P75 · > ${p.percentileBreaks.q75.toFixed(1)}`, color: '#991B1B' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '11px' }}>
                <div style={{ width: '28px', height: '17px', background: item.color, border: '1px solid rgba(255,255,255,0.45)', borderRadius: '3px', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 700 }}>{item.label}</span>
                <span style={{ color: '#CBD5E1', fontSize: '10px' }}>{item.range}</span>
              </div>
            ))}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '10px', marginTop: '8px', lineHeight: 1.4 }}>
            Los umbrales se recalculan según el conjunto de celdas del periodo y sensor seleccionados.
          </p>
        </div>

        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #19A7A0' }}>
          <div style={{ fontSize: '11px', color: '#19A7A0', fontWeight: 700, marginBottom: '4px' }}>INSPECTOR DE CELDA (CLIC)</div>
          {p.selectedCell ? (
            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
              <div>ID Malla: <code>{p.selectedCell.id}</code></div>
              <div>Región: <b>{p.selectedCell.region_id}</b> · Estado: <b>{p.selectedCell.status}</b></div>
              <div>Valor observado: <b style={{ color: '#FFC247' }}>{p.selectedCell.cell_days} días-celda</b></div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pasa el mouse o haz clic sobre cualquier celda del mapa.</div>
          )}
        </div>

        <div style={{ fontSize: '11px', color: '#cbd5e1', background: 'rgba(255, 98, 61, 0.15)', borderLeft: '3px solid #FF623D', padding: '6px 8px' }}>
          <b>Regla de precisión:</b> Solo observaciones agregadas por celda. No aplica el factor regional B1 a celdas individuales.
        </div>
      </div>
    </aside>
  );
}
