import { useState } from 'react'
import type { Method, MethodInfo, Metrics, Split, ValidationResult } from '../../../types/data'
import { METHODS, topTestErrors } from '../../../services/data/method'
const number = (value: number | null | undefined) => value == null ? 'Not available' : value.toFixed(1)
const percent = (value: number | null | undefined) => value == null ? 'Not available' : `${(value * 100).toFixed(1)}%`
const SPLIT_LABELS: Record<Split, string> = { train: 'train · training', valid: 'valid · validation', test: 'test · evaluation' }
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
  return <section className="method-section" id="evaluation" aria-labelledby="evaluation-title">
    <div className="method-section-heading"><h2 id="evaluation-title">What changes with calibration</h2><p>Retrospective evaluation against MODIS, in {validation?.region_id ?? method?.region_id ?? 'a scope not yet available'}. WAPE expresses cumulative relative error; it is not accuracy, nor confidence for future months.</p></div>
    {validation?.reportable === false && <p role="status">The test evaluation is not reportable: there are not enough data to offer comparable metrics.</p>}
    <div className="method-evaluation">
      <div className="method-results-heading"><div><h3>Cumulative relative error · WAPE</h3><p>{split === 'test' ? method?.period_test : split === 'valid' ? method?.period_valid : method?.period_train}</p></div><div className="method-switch" role="group" aria-label="Evaluation stage">{(['train', 'valid', 'test'] as const).map(value => <button key={value} aria-pressed={split === value} onClick={() => setSplit(value)}>{value === 'train' ? 'Training' : value === 'valid' ? 'Validation' : 'Test'}</button>)}</div></div>
      <div className="method-wape-comparison" aria-live="polite">{METHODS.map(name => {
        const entry = visible.find(item => item.name === name)
        return <div className={`method-wape method-wape--${name}`} key={name}><div><h4>{name} <span>{name === 'B0' ? 'VIIRS without factor' : 'Regional calibration'}</span></h4><strong title={entry?.metrics.wape == null ? undefined : String(entry.metrics.wape)}>{percent(entry?.metrics.wape)}</strong></div><div className="method-wape-track" aria-hidden="true">{entry?.metrics.wape != null && <span style={{ width: `${entry.metrics.wape / max * 100}%` }} />}</div><p>{entry ? `${entry.months} matched months · ${entry.source}` : 'No results are published for this method and stage.'}</p></div>
      })}</div>
      <p className="method-chart-note">Bar lengths are proportional to WAPE; the scale fits the largest value of the selected stage. A lower WAPE means a lower cumulative relative error.</p>
      {demo && <p>DEMO metrics are not scientific evidence.</p>}
    </div>
    <details className="method-technical"><summary>Full metrics and how to read them</summary>
      <dl className="method-metric-definitions"><div><dt>MAE</dt><dd>Mean absolute error, in cell-days.</dd></div><div><dt>WAPE</dt><dd>Sum of absolute errors divided by the sum of observed MODIS. Shown as a percentage; undefined when the denominator is zero.</dd></div><div><dt>Bias</dt><dd>Mean of estimate minus MODIS observation. Positive means overestimation; negative, underestimation. Unit: cell-days.</dd></div></dl>
      <div className="method-table-scroll" role="region" aria-label="All published metrics" tabIndex={0}><table><caption>Metrics received by method and stage; null is kept as not available</caption><thead><tr>{['Stage', 'Method', 'Months', 'MAE (cell-days)', 'WAPE', 'Bias (cell-days)', 'Source'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{entries.map(entry => <tr key={`${entry.name}-${entry.split}`}><th scope="row">{SPLIT_LABELS[entry.split]}</th><td>{entry.name}</td><td>{entry.months}</td>{(['mae', 'wape', 'bias'] as const).map(key => <td key={key} title={entry.metrics[key] == null ? undefined : String(entry.metrics[key])}>{key === 'wape' ? percent(entry.metrics[key]) : number(entry.metrics[key])}</td>)}<td>{entry.source}</td></tr>)}</tbody></table></div>
      {entries.length === 0 && <p role="status">No metrics are available. Missing results do not mean zero error.</p>}
      <p>Validation and test cover different periods. A higher WAPE can coexist with a lower MAE if the observed volume changes; values are shown as published.</p>
    </details>
    <details className="method-technical"><summary>Examine the months with the largest test error</summary><label className="method-error-filter">Method<select aria-label="Method for the errors" value={errorMethod} onChange={event => setErrorMethod(event.target.value as Method)}>{METHODS.map(name => <option key={name}>{name}</option>)}</select></label>
      {errors.length ? <div className="method-table-scroll" role="region" aria-label="Monthly test errors" tabIndex={0}><table><caption>Up to five months of {errorMethod}, sorted by the published absolute error · {validation?.region_id}</caption><thead><tr>{['Month', 'Observed MODIS', 'Estimate', 'Signed error', 'Absolute error'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{errors.map(error => <tr key={error.month}><th scope="row">{error.month}</th>{[error.modis_observed, error.estimate, error.signed_error, error.absolute_error].map((value, index) => <td key={index} title={String(value)}>{number(value)}</td>)}</tr>)}</tbody></table><p>Values in cell-days. The published residuals are kept; they are not recalculated.</p></div> : <p role="status">Monthly test detail not available for {errorMethod}.</p>}
    </details>
  </section>
}
