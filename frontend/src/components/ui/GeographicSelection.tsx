import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loadManifest, loadMethodDocument } from '../../services/data/loaders'
import { datasetMode, datasetRoot } from '../../services/data/geography'
import { leerConjunto } from '../../services/region/store'
export default function GeographicSelection() {
  const [params] = useSearchParams(), navigate = useNavigate(), location = useLocation()
  const [state,setState] = useState<{options:{id:string;name:string}[];error?:string}>({options:[]})
  const [attempt,setAttempt] = useState(0)
  useEffect(()=>{
    const controller=new AbortController(),root=datasetRoot('peru')
    void Promise.all([loadManifest(`${root}/manifest.json`,controller.signal),loadMethodDocument(`${root}/method.json`,controller.signal)]).then(([manifest,method])=>{
      if(manifest.contract_version!=='1.1'||!('contract_version' in method))throw new Error('Se requiere la publicación nacional v1.1')
      const names=new Map(method.regions.map(region=>[region.region_id,region.nombre]))
      const options=manifest.regions!.map(id=>{const name=names.get(id);if(!name)throw new Error(`Nombre regional no disponible: ${id}`);return {id,name}})
      if(!controller.signal.aborted)setState({options})
    }).catch(error=>{if(!controller.signal.aborted)setState({options:[],error:String(error)})})
    return ()=>controller.abort()
  },[attempt])
  const mode=datasetMode(params),selected=params.get('mapRegion')||(mode==='pilot'?'PE-UCA':'PE')
  if(mode==='local')return <LocalSelection />
  return <div className="geographic-selection" aria-label="Ámbito geográfico compartido">
    {mode==='demo'?<span>Modo DEMO explícito · regiones ficticias</span>:<label>Ámbito geográfico <select aria-label="Ámbito geográfico" value={selected} disabled={!state.options.length} onChange={event=>{
      const next=new URLSearchParams(params),id=event.target.value
      next.set('mapRegion',id)
      if(id==='PE-UCA')next.set('data','pilot');else next.delete('data')
      navigate({pathname:location.pathname,search:`?${next}`,hash:location.hash})
    }}>
      {!state.options.some(option=>option.id===selected)&&selected!=='PE-UCA'&&<option value={selected}>{state.options.length?'Región no válida: ':''}{selected}</option>}
      {state.options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
      {mode==='pilot'&&<option value="PE-UCA">Piloto v1.0 · Ucayali (PE-UCA)</option>}
    </select></label>}
    {mode==='peru'&&<Link to={{pathname:location.pathname,search:`?${new URLSearchParams({...Object.fromEntries(params),data:'pilot',mapRegion:'PE-UCA'})}`,hash:location.hash}}>Piloto v1.0</Link>}
    {!state.options.length&&!state.error&&<span role="status">Cargando ámbitos…</span>}
    {state.error&&<span role="alert">No se pudieron cargar los ámbitos: {state.error} <button onClick={()=>{setState({options:[]});setAttempt(attempt+1)}}>Reintentar ámbitos</button></span>}
  </div>
}

/** Mi región: el conjunto procesado o subido en este navegador. */
function LocalSelection() {
  const [params] = useSearchParams(), location = useLocation()
  const [name,setName] = useState<string|null|undefined>(undefined)
  useEffect(()=>{ void leerConjunto().then(c=>setName(c?c.nombre:null)) },[])
  const peru=new URLSearchParams(params); peru.delete('data'); peru.delete('mapRegion')
  return <div className="geographic-selection geographic-selection--local" aria-label="Ámbito geográfico compartido">
    <span className="local-chip"><span aria-hidden="true">●</span> Mi región{name?` · ${name}`:''} <em>exploratorio</em></span>
    {name===null&&<span role="alert">No hay datos de Mi región en este navegador.</span>}
    <Link to="/mi-region">Cambiar región</Link>
    <Link to={{pathname:location.pathname,search:`?${peru}`,hash:location.hash}}>Volver a Perú</Link>
  </div>
}
