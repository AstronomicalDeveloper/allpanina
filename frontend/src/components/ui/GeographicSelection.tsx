import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loadManifest, loadMethodDocument } from '../../services/data/loaders'
import { datasetMode, datasetRoot } from '../../services/data/geography'
import TechnicalDetail from './TechnicalDetail'
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
    {state.error&&<div role="alert">No se pudo cargar la lista de ámbitos geográficos. Comprueba la conexión y vuelve a intentarlo. <button onClick={()=>{setState({options:[]});setAttempt(attempt+1)}}>Reintentar ámbitos</button><TechnicalDetail detail={state.error} /></div>}
  </div>
}
