import { useState } from 'react'
import type { Method, MethodInfo, Metrics, Split, ValidationResult } from '../../../types/data'
import { METHODS, SPLIT_LABELS, topTestErrors } from '../../../services/data/method'
const number = (value: number | null | undefined) => value == null ? 'No disponible' : value.toFixed(1)
const percent = (value: number | null | undefined) => value == null ? 'No disponible' : `${(value * 100).toFixed(1)}%`
type Entry = { name: Method; split: Split; metrics: Metrics; months: number; source: string }
export default function EvaluationSection({ method, validation, demo }: { method: MethodInfo | null; validation: ValidationResult | null; demo: boolean }) {
  const [split, setSplit] = useState<Split>('test')
  const [errorMethod, setErrorMethod] = useState<Method>('B1')
  const entries: Entry[] = []
  const valid = method?.resultados?.valid
  if (valid && valid.reportable !== false) for (const name of METHODS) { const metrics = valid[name]; if (metrics) entries.push({ name, split: 'valid', metrics, months: valid.n_meses, source: 'method.json' }) }
  for (const name of METHODS) {
    const result = validation?.methods[name]
    if (result && validation?.reportable !== false) {
      // Prefer the precise evaluation file if both files publish the same split.
      const index = entries.findIndex(entry => entry.name === name && entry.split === result.split)
      if (index >= 0) entries.splice(index, 1)
      entries.push({ name, split: result.split, metrics: result.metrics, months: result.n_months_matched, source: 'validation.json' })
    }
  }
  const visible = entries.filter(entry => entry.split === split)
  const max = Math.max(1, ...visible.map(entry => entry.metrics.wape ?? 0))
  const errors = validation && validation.reportable !== false ? topTestErrors({ ...validation, methods: { [errorMethod]: validation.methods[errorMethod] } }) : []
  return <section className="method-section" id="evaluacion" aria-labelledby="evaluation-title">
    <div className="method-section-heading"><h2 id="evaluation-title">Qué cambia al calibrar</h2><p>Evaluación retrospectiva frente a MODIS, en {validation?.region_id ?? method?.region_id ?? 'el ámbito todavía no disponible'}. WAPE expresa error relativo acumulado; no es precisión ni confianza para meses futuros.</p></div>
    {validation?.reportable === false && <p role="status">La evaluación de prueba no es reportable: datos insuficientes para ofrecer métricas comparables.</p>}
    <div className="method-evaluation">
      <div className="method-results-heading"><div><h3>Error relativo acumulado · WAPE</h3><p>{split === 'test' ? method?.period_test : split === 'valid' ? method?.period_valid : method?.period_train}</p></div><div className="method-switch" role="group" aria-label="Etapa de evaluación">{(['train', 'valid', 'test'] as const).map(value => <button key={value} aria-pressed={split === value} onClick={() => setSplit(value)}>{value === 'train' ? 'Entrenamiento' : value === 'valid' ? 'Validación' : 'Prueba'}</button>)}</div></div>
      <div className="method-wape-comparison" aria-live="polite">{METHODS.map(name => {
        const entry = visible.find(item => item.name === name)
        return <div className={`method-wape method-wape--${name}`} key={name}><div><h4>{name} <span>{name === 'B0' ? 'VIIRS sin factor' : 'Calibración regional'}</span></h4><strong title={entry?.metrics.wape == null ? undefined : String(entry.metrics.wape)}>{percent(entry?.metrics.wape)}</strong></div><div className="method-wape-track" aria-hidden="true">{entry?.metrics.wape != null && <span style={{ width: `${entry.metrics.wape / max * 100}%` }} />}</div><p>{entry ? `${entry.months} meses emparejados · ${entry.source}` : 'No hay resultados publicados para este método y etapa.'}</p></div>
      })}</div>
      <p className="method-chart-note">Longitudes proporcionales al WAPE; la escala se ajusta al mayor valor de la etapa seleccionada. Menor WAPE indica menor error relativo acumulado.</p>
      {demo && <p>Las métricas DEMO no constituyen evidencia científica.</p>}
    </div>
    <details className="method-technical"><summary>Métricas completas y cómo interpretarlas</summary>
      <dl className="method-metric-definitions"><div><dt>MAE</dt><dd>Promedio del error absoluto, en días-celda.</dd></div><div><dt>WAPE</dt><dd>Suma de errores absolutos dividida entre la suma de MODIS observado. Se muestra como porcentaje; si el denominador es cero, no está definido.</dd></div><div><dt>Sesgo</dt><dd>Promedio de estimación menos observación MODIS. Positivo indica sobreestimación; negativo, subestimación. Unidad: días-celda.</dd></div></dl>
      <div className="method-table-scroll" role="region" aria-label="Todas las métricas publicadas" tabIndex={0}><table><caption>Métricas recibidas por método y etapa; null se conserva como no disponible</caption><thead><tr>{['Etapa', 'Método', 'Meses', 'MAE (días-celda)', 'WAPE', 'Sesgo (días-celda)', 'Fuente'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{entries.map(entry => <tr key={`${entry.name}-${entry.split}`}><th scope="row">{SPLIT_LABELS[entry.split]}</th><td>{entry.name}</td><td>{entry.months}</td>{(['mae', 'wape', 'bias'] as const).map(key => <td key={key} title={entry.metrics[key] == null ? undefined : String(entry.metrics[key])}>{key === 'wape' ? percent(entry.metrics[key]) : number(entry.metrics[key])}</td>)}<td>{entry.source}</td></tr>)}</tbody></table></div>
      {entries.length === 0 && <p role="status">No hay métricas disponibles. La ausencia de resultados no equivale a error cero.</p>}
      <p>Validación y prueba corresponden a períodos distintos. Un WAPE mayor puede coexistir con un MAE menor si cambia el volumen observado; los valores se muestran tal como se publicaron.</p>
    </details>
    <details className="method-technical"><summary>Examinar los meses con mayor error en prueba</summary><label className="method-error-filter">Método<select aria-label="Método de los errores" value={errorMethod} onChange={event => setErrorMethod(event.target.value as Method)}>{METHODS.map(name => <option key={name}>{name}</option>)}</select></label>
      {errors.length ? <div className="method-table-scroll" role="region" aria-label="Errores mensuales de prueba" tabIndex={0}><table><caption>Hasta cinco meses de {errorMethod}, ordenados por error absoluto recibido · {validation?.region_id}</caption><thead><tr>{['Mes', 'MODIS observado', 'Estimación', 'Error con signo', 'Error absoluto'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{errors.map(error => <tr key={error.month}><th scope="row">{error.month}</th>{[error.modis_observed, error.estimate, error.signed_error, error.absolute_error].map((value, index) => <td key={index} title={String(value)}>{number(value)}</td>)}</tr>)}</tbody></table><p>Valores en días-celda. Se conservan los residuos publicados; no se recalculan.</p></div> : <p role="status">Detalle mensual de prueba no disponible para {errorMethod}.</p>}
    </details>
  </section>
}
