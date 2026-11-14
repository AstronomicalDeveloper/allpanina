import type { ValidationResult } from '../../types/data.ts'
import { METHODS, SPLIT_LABELS, metricText } from '../../services/data/method.ts'

export default function MethodMetrics({ validation, label = 'Test' }: { validation: ValidationResult; label?: string }) {
  return (
    <section aria-label={`Métricas ${label}`}>
      <h2 id={label === 'Test' ? 'method-metrics-title' : 'method-valid-metrics-title'}>Métricas recibidas · {label} · {validation.region_id}</h2>
      <p>WAPE: proporción recibida × 100, expresada en porcentaje. MAE y sesgo: días-celda.</p>
      <div className="method-metrics">
        {METHODS.map(name => {
          const result = validation.methods[name]
          return <article key={name} aria-label={`Métricas ${name}`}>
            <h3>{name}</h3>
            {!result ? <p>No disponible: el archivo no contiene resultados de {name}.</p> : <>
              <p>Split: <strong>{SPLIT_LABELS[result.split]}</strong></p>
              <dl>
                <div><dt>MAE</dt><dd>{metricText(result.metrics.mae)}</dd></div>
                <div><dt>WAPE (%)</dt><dd>{result.metrics.wape === null ? 'No disponible' : `${(result.metrics.wape * 100).toFixed(1)}%`}</dd></div>
                <div><dt>Sesgo (bias)</dt><dd>{metricText(result.metrics.bias)}</dd></div>
                <div><dt>Meses emparejados</dt><dd>{result.n_months_matched}</dd></div>
              </dl>
            </>}
          </article>
        })}
      </div>
    </section>
  )
}
