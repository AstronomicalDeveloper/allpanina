import type { ValidationResult } from '../../types/data.ts'
import { topTestErrors } from '../../services/data/method.ts'

export default function MethodErrors({ validation }: { validation: ValidationResult }) {
  const errors = topTestErrors(validation)
  return (
    <section aria-labelledby="method-errors-title">
      <h2 id="method-errors-title">Mayores errores mensuales de test</h2>
      {!errors.length ? <p role="status">Detalle mensual no disponible: no hay residuos de test utilizables.</p> : <>
        <p>Hasta cinco registros método-mes, ordenados por el error absoluto recibido. No se calculan residuos nuevos.</p>
        <div className="method-table-scroll" role="region" aria-label="Residuos de test" tabIndex={0}>
          <table>
            <caption>Errores recibidos · {validation.region_id} · split test</caption>
            <thead><tr>{['Mes', 'Método', 'MODIS observado', 'Estimación', 'Error con signo', 'Error absoluto'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{errors.map(error => <tr key={`${error.method}-${error.month}`}>
              <th scope="row">{error.month}</th><td>{error.method}</td><td>{error.modis_observed}</td>
              <td>{error.estimate}</td><td>{error.signed_error}</td><td>{error.absolute_error}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
  )
}
