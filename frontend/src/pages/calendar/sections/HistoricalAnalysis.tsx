import {historicalAnalysis} from '../../../services/data/historicalAnalysis'
import type {HistoricalSelection} from '../../../services/data/historicalAnalysis'
import type {MonthlyRecord} from '../../../types/data'
import {MONTHS} from '../../../services/data/calendar'
const number=new Intl.NumberFormat('es-PE',{maximumFractionDigits:2})
export default function HistoricalAnalysis({records,selection}:{records:MonthlyRecord[];selection:HistoricalSelection}) {
 const result=historicalAnalysis(records,selection)
 const maximum=Math.max(1,...result.points.map(p=>p.value))
 return <details className="calendar-history"><summary>Análisis histórico</summary>
  <p>Compara {MONTHS[selection.month-1].toLowerCase()} de {selection.year} con el mismo mes de años anteriores, para {selection.region} y {selection.sensor}.</p>
  <dl><div><dt>Valor seleccionado</dt><dd>{result.selectedValue===null?'Sin dato válido':`${number.format(result.selectedValue)} días-celda`}</dd></div>
  <div><dt>Años anteriores válidos</dt><dd>{result.count}</dd></div>
  {result.status==='ready'&&<><div><dt>Mediana histórica</dt><dd>{number.format(result.median)} días-celda</dd></div>
  <div><dt>Diferencia absoluta</dt><dd>{number.format(result.absoluteDifference)} días-celda{result.difference>0?' por encima':result.difference<0?' por debajo':' · igual a la mediana'}</dd></div>
  <div><dt>Diferencia porcentual</dt><dd>{result.percentage===null?'No calculable: mediana igual a cero':`${result.percentage>0?'+':''}${number.format(result.percentage)}%`}</dd></div></>}
  </dl>
  {result.status==='insufficient'&&<p role="status">Historial insuficiente: se necesitan al menos tres años anteriores válidos.</p>}
  {result.status==='unavailable'&&<p role="status">Sin comparación: el mes seleccionado no tiene una observación válida.</p>}
  {!!result.points.length&&<figure><figcaption>{MONTHS[selection.month-1]} por año · días-celda observados</figcaption><ul className="calendar-history-chart" aria-label="Valores anuales del mismo mes">{result.points.map(point=><li key={point.year} className={point.selected?'is-selected':''}><span>{point.year}{point.selected&&<small>Seleccionado</small>}</span><span className="calendar-history-track" aria-hidden="true"><i style={{width:`${point.value/maximum*100}%`}} /></span><strong>{number.format(point.value)}</strong></li>)}</ul></figure>}
  <p className="calendar-history-note">Se incluyen ceros válidos y se excluyen faltantes y años posteriores. Las diferencias describen actividad térmica satelital observada; no prueban cambios en incendios confirmados ni significancia estadística.</p>
 </details>
}
