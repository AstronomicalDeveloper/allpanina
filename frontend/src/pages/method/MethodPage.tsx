import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadManifest, loadMethod, loadValidation, safelyLoad } from '../../services/data/loaders'
import type { LoadResult } from '../../services/data/loaders'
import type { Manifest, MethodInfo, ValidationResult } from '../../types/data'
import ProcessingSection from './sections/ProcessingSection'
import EvaluationSection from './sections/EvaluationSection'
import SourcesSection from './sections/SourcesSection'

function MethodContent({ dataRoot, demo }: { dataRoot: string; demo: boolean }) {
  const [method, setMethod] = useState<LoadResult<MethodInfo> | null>(null)
  const [validation, setValidation] = useState<LoadResult<ValidationResult> | null>(null)
  const [manifest, setManifest] = useState<LoadResult<Manifest> | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const options = [
      safelyLoad(() => loadMethod(`${dataRoot}/method.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setMethod(result) }),
      safelyLoad(() => loadValidation(`${dataRoot}/validation.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setValidation(result) }),
      safelyLoad(() => loadManifest(`${dataRoot}/manifest.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setManifest(result) }),
    ]
    void Promise.all(options)
    return () => controller.abort()
  }, [dataRoot, attempt])
  const info = method?.ok ? method.data : null
  const publication = manifest?.ok ? manifest.data : null
  const evaluation = validation?.ok ? validation.data : null
  const regions = [info?.region_id, publication?.region_id, evaluation?.region_id].filter(Boolean)
  const conflict = new Set(regions).size > 1
  const errors = [method, validation, manifest].filter(result => result && !result.ok)
  return <>
    <header className="method-intro"><div><h1>Método y evaluación</h1><p className="method-lead">Leer las señales del fuego, comprender sus límites.</p><p>AllpaNina permite explorar la historia de las anomalías térmicas observadas por satélite y comparar lo que registran distintos instrumentos.</p></div>
      <aside className="method-scope" aria-label="Alcance de la publicación"><h2>El conjunto que estás explorando</h2>
        {publication ? <><strong>{publication.region_id}</strong><p>{publication.periodo.desde} — {publication.periodo.hasta}</p><p>{publication.producto}</p></> : <p>Alcance pendiente de lectura del manifiesto.</p>}
        {info?.region && <p>{info.region}</p>}
        <p>Las métricas pertenecen al ámbito declarado en los archivos; no acreditan validación para todo Perú.</p>
      </aside>
    </header>
    {demo && <p className="method-notice"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES.</strong> Este modo solo comprueba la interfaz; no acredita resultados científicos.</p>}
    {(method === null || validation === null || manifest === null) && <p role="status">Cargando metodología, evaluación y procedencia…</p>}
    {errors.map((result, index) => result && !result.ok && <p role="alert" className="method-notice" key={index}>No se pudo leer un archivo científico: {result.error}</p>)}
    {errors.length > 0 && <button className="method-retry" onClick={() => { setMethod(null); setValidation(null); setManifest(null); setAttempt(attempt + 1) }}>Reintentar carga</button>}
    {conflict && <p role="alert" className="method-notice">Los archivos declaran regiones diferentes. No se combinan los resultados ni se atribuye una evaluación a otra región. Revisa la entrega científica.</p>}
    <nav className="method-index" aria-label="Contenido de Método"><a href="#observaciones">De la señal al indicador</a><a href="#evaluacion">Cómo se evalúa</a><a href="#limites">Límites y fuentes</a></nav>
    {info ? <ProcessingSection method={info} demo={demo} /> : <section id="observaciones" className="method-section"><h2>De la señal al indicador</h2><p>La explicación del procesamiento estará disponible cuando se pueda leer method.json.</p></section>}
    <EvaluationSection key={`${dataRoot}-${attempt}-${conflict}`} method={conflict ? null : info} validation={conflict ? null : evaluation} demo={demo} />
    <SourcesSection method={info} manifest={publication} dataRoot={dataRoot} />
  </>
}
export default function MethodPage() {
  const [params] = useSearchParams()
  const demo = params.get('data') === 'demo'
  const dataRoot = demo ? '/data/demo' : '/data'
  return <article className="method-v2"><MethodContent key={dataRoot} dataRoot={dataRoot} demo={demo} /></article>
}
