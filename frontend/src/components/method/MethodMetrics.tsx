import type { ValidationResult } from '../../types/data.ts'
import { METHODS, SPLIT_LABELS, metricText } from '../../services/data/method.ts'

export default function MethodMetrics({ validation }: { validation: ValidationResult }) {
  return (
    <section aria-labelledby="method-metrics-title">
      <h2 id="method-metrics-title">Métricas recibidas · {validation.region_id}</h2>
      <p>WAPE se muestra en la escala recibida. No se ha confirmado si es proporción o porcentaje; no se convierte ni se añade %.</p>
      <div className="method-metrics">
        {METHODS.map(name => {
          const result = validation.methods[name]
          return <article key={name} aria-label={`Métricas ${name}`}>
            <h3>{name}</h3>
            {!result ? <p>No disponible: el archivo no contiene resultados de {name}.</p> : <>
              <p>Split: <strong>{SPLIT_LABELS[result.split]}</strong></p>
              <dl>
                <div><dt>MAE</dt><dd>{metricText(result.metrics.mae)}</dd></div>
                <div><dt>WAPE (escala recibida)</dt><dd>{metricText(result.metrics.wape)}</dd></div>
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
