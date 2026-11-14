import type { MethodInfo } from '../../types/data.ts'

export default function MethodExplanation({ method }: { method: MethodInfo }) {
  return (
    <section aria-labelledby="method-explanation-title">
      <h2 id="method-explanation-title">Qué se mide y cómo</h2>
      <dl>
        <div><dt>Indicador declarado</dt><dd>{method.indicator}</dd></div>
        <div><dt>Sensores declarados</dt><dd>{method.sensors.length ? method.sensors.join(', ') : 'No disponible'}</dd></div>
        <div><dt>Entrenamiento (train)</dt><dd>{method.period_train}</dd></div>
        <div><dt>Validación (valid)</dt><dd>{method.period_valid}</dd></div>
        <div><dt>Evaluación (test)</dt><dd>{method.period_test}</dd></div>
      </dl>
      <h3>B0 y B1: declaración de calibración</h3>
      <p>{method.calibration}</p>
      <p>Este texto procede de method.json. El formato no incluye definiciones separadas de B0 y B1; no se infieren fórmulas adicionales.</p>
      <h3>Limitaciones declaradas</h3>
      {method.limitations.length ? <ul>{method.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul> : <p>No se han declarado limitaciones en el archivo.</p>}
    </section>
  )
}
