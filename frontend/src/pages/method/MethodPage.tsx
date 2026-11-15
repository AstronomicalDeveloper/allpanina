import { datasetMode, datasetRoot } from '../../services/data/geography'
import { regionalMethod } from '../../services/data/regionalMethod'
import NationalMethodNotes from './sections/NationalMethodNotes'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadManifest, loadMethodDocument, loadValidationDocument, loadCalibratedSeries, safelyLoad } from '../../services/data/loaders'
import type { LoadResult } from '../../services/data/loaders'
import type { Manifest, MethodInfo, ValidationResult, NationalMethod, NationalValidation, CalibratedRecord } from '../../types/data'
import ProcessingSection from './sections/ProcessingSection'
import EvaluationSection from './sections/EvaluationSection'
import SourcesSection from './sections/SourcesSection'
import TechnicalDetail from '../../components/ui/TechnicalDetail'

function MethodContent({ dataRoot, demo, national, region }: { dataRoot: string; demo: boolean; national: boolean; region: string }) {
  const [method, setMethod] = useState<LoadResult<MethodInfo | NationalMethod> | null>(null)
  const [validation, setValidation] = useState<LoadResult<ValidationResult | NationalValidation> | null>(null)
  const [manifest, setManifest] = useState<LoadResult<Manifest> | null>(null)
  const [calibrated,setCalibrated]=useState<LoadResult<CalibratedRecord[]>|null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const options = [
      safelyLoad(() => loadMethodDocument(`${dataRoot}/method.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setMethod(result) }),
      safelyLoad(() => loadValidationDocument(`${dataRoot}/validation.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setValidation(result) }),
      safelyLoad(() => loadManifest(`${dataRoot}/manifest.json`, controller.signal)).then(result => { if (!controller.signal.aborted) setManifest(result) }),
    ]
    if(national)options.push(safelyLoad(()=>loadCalibratedSeries(`${dataRoot}/calibrated_series.csv`,controller.signal)).then(result=>{if(!controller.signal.aborted)setCalibrated(result)}))
    void Promise.all(options)
    return () => controller.abort()
  }, [dataRoot, attempt, national])
  const rawMethod=method?.ok?method.data:null,rawValidation=validation?.ok?validation.data:null
  const nationalMethod=rawMethod&&'contract_version' in rawMethod?rawMethod:null
  const nationalValidation=rawValidation&&'contract_version' in rawValidation?rawValidation:null
  const selected=regionalMethod(nationalMethod,nationalValidation,region)
  const info=national?selected.info:rawMethod&&!nationalMethod?rawMethod as MethodInfo:null
  const publication = manifest?.ok ? manifest.data : null
  const evaluation=national?selected.metrics:rawValidation&&!nationalValidation?rawValidation as ValidationResult:null
  const regions=[rawMethod?.region_id,publication?.region_id,...(rawValidation&&!('contract_version' in rawValidation)?[rawValidation.region_id]:[])].filter(Boolean)
  const conflict=new Set(regions).size>1 || (!national&&Boolean(nationalMethod||nationalValidation)) || (national&&Boolean((rawMethod&&!nationalMethod)||(rawValidation&&!nationalValidation)||(publication&&(!publication.regions?.includes(region)||publication.contract_version!=='1.1'))))
  const errors=[method,validation,manifest,...(national?[calibrated]:[])].filter(result=>result&&!result.ok)
  return <>
    <header className="method-intro"><div><h1>Método y evaluación</h1><p className="method-lead">Leer las señales del fuego, comprender sus límites.</p><p>AllpaNina permite explorar la historia de las anomalías térmicas observadas por satélite y comparar lo que registran distintos instrumentos.</p></div>
      <aside className="method-scope" aria-label="Alcance de la publicación"><h2>El conjunto que estás explorando</h2>
        {publication ? <><strong>{national?region:publication.region_id}</strong>{national&&<p>Publicación nacional: {publication.region_id}</p>}<p>{publication.periodo.desde} — {publication.periodo.hasta}</p><p>{publication.producto}</p></> : <p>Alcance pendiente de lectura del manifiesto.</p>}
        {info?.region && <p>{info.region}</p>}
        <p>{national?'Las métricas corresponden a la región y etapa indicadas; describen una evaluación retrospectiva, no confianza futura.':'Las métricas pertenecen al ámbito declarado en los archivos; no acreditan validación para todo Perú.'}</p>
      </aside>
    </header>
    {demo && <p className="method-notice"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES.</strong> Este modo solo comprueba la interfaz; no acredita resultados científicos.</p>}
    {(method === null || validation === null || manifest === null || (national&&calibrated===null)) && <p role="status">Cargando metodología, evaluación y procedencia…</p>}
    {errors.map((result, index) => result && !result.ok && <div role="alert" className="method-notice" key={index}><p>No se pudo leer uno de los archivos de la metodología. Las secciones que dependen de él no se muestran ni se rellenan con otros valores.</p><TechnicalDetail detail={result.error} /></div>)}
    {errors.length > 0 && <button className="method-retry" onClick={() => { setMethod(null); setValidation(null); setManifest(null); setCalibrated(null); setAttempt(attempt + 1) }}>Reintentar carga</button>}
    {conflict && <p role="alert" className="method-notice">Los archivos declaran regiones diferentes. No se combinan los resultados ni se atribuye una evaluación a otra región. Revisa la entrega científica.</p>}
    <nav className="method-index" aria-label="Contenido de Método"><a href="#observaciones">De la señal al indicador</a><a href="#evaluacion">Cómo se evalúa</a><a href="#limites">Límites y fuentes</a></nav>
    {info ? <ProcessingSection method={info} demo={demo} national={national} aggregate={national&&region==='PE'} /> : <section id="observaciones" className="method-section"><h2>De la señal al indicador</h2><p>La explicación del procesamiento estará disponible cuando se pueda leer method.json.</p></section>}
    {national&&!conflict&&<NationalMethodNotes method={nationalMethod} validation={nationalValidation} region={region} calibrated={calibrated?.ok?calibrated.data:null} />}
    <EvaluationSection key={`${dataRoot}-${attempt}-${conflict}`} method={conflict ? null : info} validation={conflict ? null : evaluation} demo={demo} />
    <SourcesSection method={info} manifest={publication} dataRoot={dataRoot} />
  </>
}
export default function MethodPage() {
  const [params] = useSearchParams()
  const mode=datasetMode(params),national=mode==='peru',demo=mode==='demo'
  const dataRoot=datasetRoot(mode),region=params.get('mapRegion')||(national?'PE':'PE-UCA')
  return <article className="method-v2"><MethodContent key={`${dataRoot}-${region}`} dataRoot={dataRoot} demo={demo} national={national} region={region} /></article>
}
