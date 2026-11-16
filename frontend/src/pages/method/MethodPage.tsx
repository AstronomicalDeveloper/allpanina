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
import { Published } from './sections/Published'

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
    <header className="method-intro"><div><h1>Method and evaluation</h1><p className="method-lead">Reading the signals of fire, understanding their limits.</p><p>AllpaNina lets you explore the history of satellite-observed thermal anomalies and compare what different instruments record.</p></div>
      <aside className="method-scope" aria-label="Publication scope"><h2>The data set you are exploring</h2>
        {publication ? <><strong>{national?region:publication.region_id}</strong>{national&&<p>National publication: {publication.region_id}</p>}<p>{publication.periodo.desde} — {publication.periodo.hasta}</p><p>{demo ? 'Synthetic demonstration data' : publication.producto}</p></> : <p>Scope pending: the manifest has not been read yet.</p>}
        {info?.region && <p><Published>{info.region}</Published></p>}
        <p>{national?'The metrics belong to the region and stage shown; they describe a retrospective evaluation, not confidence for the future.':'The metrics belong to the scope declared in the files; they do not validate the method for all of Peru.'}</p>
      </aside>
    </header>
    {demo && <p className="method-notice"><strong>DEMO DATA — NOT REAL OBSERVATIONS.</strong> This mode only checks the interface; it does not support scientific results.</p>}
    {(method === null || validation === null || manifest === null || (national&&calibrated===null)) && <p role="status">Loading method, evaluation and provenance…</p>}
    {errors.map((result, index) => result && !result.ok && <div role="alert" className="method-notice" key={index}><p>One of the method files could not be read. The sections that depend on it are not shown and are not filled with other values.</p>{result.error && <details className="technical-detail"><summary>Technical details</summary><code>{result.error}</code></details>}</div>)}
    {errors.length > 0 && <button className="method-retry" onClick={() => { setMethod(null); setValidation(null); setManifest(null); setCalibrated(null); setAttempt(attempt + 1) }}>Retry loading</button>}
    {conflict && <p role="alert" className="method-notice">The files declare different regions. The results are not combined and no evaluation is attributed to another region. Check the scientific delivery.</p>}
    <nav className="method-index" aria-label="Method contents"><a href="#observations">From signal to indicator</a><a href="#evaluation">How it is evaluated</a><a href="#limits">Limits and sources</a></nav>
    {info ? <ProcessingSection method={info} demo={demo} national={national} aggregate={national&&region==='PE'} /> : <section id="observations" className="method-section"><h2>From signal to indicator</h2><p>The processing explanation will be available once method.json can be read.</p></section>}
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
