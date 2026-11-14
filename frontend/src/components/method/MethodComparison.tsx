import type { ValidationResult } from '../../types/data.ts'
import { METHODS, SPLITS, SPLIT_LABELS, hasMetrics } from '../../services/data/method.ts'

export default function MethodComparison({ validation, validResults }: { validation: ValidationResult; validResults?: ValidationResult | null }) {
  return (
    <section aria-labelledby="method-comparison-title">
      <h2 id="method-comparison-title">Disponibilidad para comparar B0 y B1</h2>
      <div className="method-table-scroll" role="region" aria-label="Disponibilidad por método y split" tabIndex={0}>
        <table>
          <caption>Resultados separados por split · {validation.region_id}</caption>
          <thead><tr><th scope="col">Split</th>{METHODS.map(method => <th key={method} scope="col">{method}</th>)}</tr></thead>
          <tbody>{SPLITS.map(split => <tr key={split}>
            <th scope="row">{SPLIT_LABELS[split]}</th>
            {METHODS.map(method => {
              const result = split === 'valid' && validResults ? validResults.methods[method] : validation.methods[method]
              const matching = result?.split === split
              const available = matching && hasMetrics({ ...validation, methods: { [method]: result } })
              return <td key={method}>{matching ? `${available ? 'Métricas recibidas' : 'Métricas no disponibles'} · ${result.n_months_matched} meses emparejados` : 'No disponible'}</td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <p>No se comparan splits distintos ni se declara que B1 mejore B0. Tener métricas de ambos métodos no confirma que se evaluaron sobre los mismos meses.</p>
    </section>
  )
}
