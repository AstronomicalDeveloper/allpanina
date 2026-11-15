import { formatDateLabel } from '../../constants/mapConfig';
import type { SensorGroup } from '../../types/fireMap';

interface MapHeaderProps {
  cursorCoords: { lat: number; lon: number };
  day: number;
  month: number;
  year: number;
  sensor: SensorGroup;
}

export function MapHeader({ cursorCoords, day, month, year, sensor }: MapHeaderProps) {
  return (
    <>
      <header
        style={{
          height: '54px', background: 'linear-gradient(90deg, #14213D 0%, #16865B 100%)', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)', zIndex: 10, position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#FF623D', color: '#fff', fontWeight: 800, padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.5px', fontSize: '14px' }}>
            ALLPANINA
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.3px' }}>
              VISOR HISTÓRICO MODIS × VIIRS — PERÚ (PILOTO UCAYALI)
            </div>
            <div style={{ fontSize: '11px', color: '#FFF3DF', opacity: 0.9 }}>
              NASA Space Apps Challenge 2026 · Días-celda con detección térmica observada
            </div>
          </div>
        </div>
        <div style={{ background: '#FFC247', color: '#14213D', padding: '5px 12px', borderRadius: '4px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>
          FIXTURE DEMO — DATOS SINTÉTICOS (.TSX)
        </div>
      </header>

      <div
        style={{
          position: 'absolute', top: '64px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20, 33, 61, 0.88)', color: '#FFF3DF', padding: '6px 16px', borderRadius: '6px',
          fontSize: '12px', fontWeight: 600, zIndex: 5, display: 'flex', gap: '18px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)', border: '1px solid rgba(25, 167, 160, 0.5)',
        }}
      >
        <span>Lat: {cursorCoords.lat}° · Lon: {cursorCoords.lon}°</span>
        <span>|</span>
        <span>Periodo: {formatDateLabel(day, month, year)}</span>
        <span>|</span>
        <span>Sensor: {sensor === 'MODIS_TA' ? 'MODIS (Terra+Aqua)' : 'VIIRS (S-NPP)'}</span>
      </div>
    </>
  );
}
