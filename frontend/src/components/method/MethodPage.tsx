import { useEffect, useState } from 'react'
import type { MethodInfo, ValidationResult } from '../../types/data.ts'
import { loadMethod, loadValidation, safelyLoad } from '../../services/data/loaders.ts'
import type { LoadResult } from '../../services/data/loaders.ts'
import { hasMetrics, hasPartialResults } from '../../services/data/method.ts'
import MethodExplanation from './MethodExplanation.tsx'
import MethodMetrics from './MethodMetrics.tsx'
import MethodComparison from './MethodComparison.tsx'
import MethodErrors from './MethodErrors.tsx'

function MethodContent({ dataRoot }: { dataRoot: string }) {
  const [method, setMethod] = useState<LoadResult<MethodInfo> | null>(null)
  const [validation, setValidation] = useState<LoadResult<ValidationResult> | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void safelyLoad(() => loadMethod(`${dataRoot}/method.json`, controller.signal)).then(result => {
      if (!controller.signal.aborted) setMethod(result)
    })
    void safelyLoad(() => loadValidation(`${dataRoot}/validation.json`, controller.signal)).then(result => {
      if (!controller.signal.aborted) setValidation(result)
    })
    return () => controller.abort()
  }, [dataRoot, attempt])

  const loading = method === null || validation === null
  const fileErrors = (method !== null && !method.ok) || (validation !== null && !validation.ok)
  const results = validation?.ok ? validation.data : null
  const partial = (fileErrors && (method?.ok || validation?.ok)) || (results !== null && hasPartialResults(results))
  return <>
    {loading && <p role="status">Cargando archivos de método y evaluación…</p>}
    {!loading && partial && <p role="status">Resultados parciales: faltan archivos, métodos o métricas. Se muestra únicamente la información disponible.</p>}
    {!loading && results && !hasMetrics(results) && <p role="status">Sin resultados de métricas disponibles. Los valores nulos no equivalen a cero.</p>}
    {fileErrors && <button type="button" onClick={() => { setMethod(null); setValidation(null); setAttempt(attempt + 1) }}>Reintentar carga</button>}
    {method && !method.ok && <p role="alert">No se pudo leer method.json; archivo inaccesible o inválido: {method.error}</p>}
    {validation && !validation.ok && <p role="alert">No se pudo leer validation.json; archivo inaccesible o inválido: {validation.error}</p>}
    {method?.ok && <MethodExplanation method={method.data} />}
    {results && <>
      <MethodMetrics validation={results} />
      <MethodComparison validation={results} />
      <MethodErrors validation={results} />
    </>}
  </>
}

export default function MethodPage({ dataRoot }: { dataRoot: string }) {
  const root = dataRoot.replace(/\/$/, '')
  return <main className="method-page">
    <h1>Método y evaluación</h1>
    <p className="method-demo"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>
    <p>Contenido y cifras leídos de archivos de intercambio. Esta pantalla no ejecuta calibración ni evaluación científica.</p>
    <p className="method-source">Fuentes: {root}/method.json y {root}/validation.json.</p>
    <MethodContent key={root} dataRoot={root} />
  </main>
}
