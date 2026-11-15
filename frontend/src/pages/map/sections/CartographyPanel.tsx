import CellDaysHelp from '../../../components/ui/CellDaysHelp'
import { PURPOSE_CELL } from '../../../components/ui/cellDaysPurpose'
import type { MapController } from '../useJuanMap'
import type { OverlayState } from '../cartography/juanLayers'
import { percentileLegend } from './percentileLegend'
const overlays: [keyof OverlayState, string][] = [
  ['graticule', 'Cuadrícula de coordenadas'], ['basic', 'Referencias y límites de Perú'],
  ['detailed', 'Cartografía detallada de Perú'], ['protectedAreas', 'Áreas protegidas · Ucayali'],
]
export default function CartographyPanel({ map, national = false }: { map: MapController; national?: boolean }) {
  const { q25, q50, q75 } = map.percentileBreaks
  return <div className="map-panel-content">
    <fieldset><legend>Fondo cartográfico</legend><div className="map-segment map-basemaps">
      <button aria-pressed={map.baseMap === 'blue-marble'} onClick={() => map.setBaseMap('blue-marble')}><span aria-hidden="true">◉</span>Satelital<small>Blue Marble · NASA</small></button>
      <button aria-pressed={map.baseMap === 'topographic'} onClick={() => map.setBaseMap('topographic')}><span aria-hidden="true">△</span>Relieve<small>Topographic · Esri</small></button>
    </div></fieldset>
    <fieldset className="map-overlays"><legend>Capas de referencia</legend>{overlays.map(([key, label]) => <label key={key}><input type="checkbox" checked={map.overlays[key]} onChange={event => map.setOverlays({ ...map.overlays, [key]: event.target.checked })} />{label}</label>)}</fieldset>
    <label className="map-opacity">Opacidad de celdas <output>{Math.round(map.opacity * 100)}%</output><input aria-label="Opacidad de celdas" type="range" min="0.2" max="1" step="0.05" value={map.opacity} onChange={event => map.setOpacity(Number(event.target.value))} /></label>
    <section className="map-legend" aria-label="Leyenda de días-celda"><p aria-live="polite">{map.representation === 'summary' ? 'Vista general · cuadrados individuales' : 'Vista local · celdas originales'}</p>
      <h3>Intensidad observada · percentiles</h3><p>{map.representation === 'summary' ? 'Cada cuadrado localiza una celda. Su tamaño en pantalla está ampliado y no representa área ocupada ni un incendio independiente.' : 'Polígonos originales de las celdas observadas.'} Los colores representan el mismo valor observado en ambas escalas.</p><p>{national?'Días-celda de 1 km por cuadrícula de 10 km':'Días-celda por celda'} · {map.scope === 'year' ? 'acumulado anual' : 'mes seleccionado'}</p>
      {map.stats.count === 0 ? <p>Sin celdas para calcular percentiles.</p> : <><ol>{percentileLegend(q25, q50, q75).map(({ color, range, label }) => <li key={label}><i style={{ background: color }} aria-hidden="true" /><span>{label}</span><strong>{range}</strong></li>)}</ol><p>Los percentiles ordenan los valores de las celdas del período y sensor seleccionados. Un color más intenso indica {national?'más días-celda de 1 km acumulados en cada cuadrícula':'más días con detecciones por celda'} dentro de esta clasificación; no mide gravedad, riesgo ni superficie quemada. Los umbrales se recalculan y no son una escala fija entre períodos o sensores.</p></>}
      {national&&<details><summary>Límite territorial resaltado</summary><p>Referencia INEI 2023 simplificada para navegar. El filtro y recorte son solo cartográficos. Una celda fronteriza puede incluir observaciones de territorios vecinos; su valor original no es proporcional al fragmento visible.</p></details>}
      <CellDaysHelp national={national} purpose={PURPOSE_CELL} />
    </section>
    <p className="map-fine-print">Fondos y referencias requieren internet. La capa de áreas protegidas conserva el ámbito del piloto Ucayali.</p>
  </div>
}
