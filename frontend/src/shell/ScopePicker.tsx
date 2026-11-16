import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { loadManifest, loadMethodDocument } from '../services/data/loaders'
import { datasetMode, datasetRoot } from '../services/data/geography'
import { leerConjunto } from '../services/region/store'
import TechnicalDetail from '../components/ui/TechnicalDetail'
import { ROUTES } from './routes'
import { areaName } from './scope'

type Area = { id: string; name: string }

const linkClass = 'text-sm text-mist underline underline-offset-4 hover:text-white'
const selectClass = 'min-h-9 min-w-0 w-full cursor-pointer appearance-none rounded-control border border-rule bg-orbit py-1 pl-3 pr-8 font-sans text-sm text-white disabled:opacity-60'

/**
 * Selector de ámbito de la barra superior (D7). Lee y escribe `mapRegion` y `data` en la URL,
 * como el selector anterior: Perú y sus 25 departamentos, piloto de Ucayali, DEMO y My region (local).
 */
export default function ScopePicker() {
  const [params] = useSearchParams(), navigate = useNavigate(), location = useLocation()
  const [state, setState] = useState<{ options: Area[]; error?: string }>({ options: [] })
  const [attempt, setAttempt] = useState(0)
  const mode = datasetMode(params)
  useEffect(() => {
    if (mode === 'local' || mode === 'demo') return
    const controller = new AbortController(), root = datasetRoot('peru')
    void Promise.all([loadManifest(`${root}/manifest.json`, controller.signal), loadMethodDocument(`${root}/method.json`, controller.signal)]).then(([manifest, method]) => {
      if (manifest.contract_version !== '1.1' || !('contract_version' in method)) throw new Error('The national publication v1.1 is required')
      const names = new Map(method.regions.map(region => [region.region_id, region.nombre]))
      const options = manifest.regions!.map(id => {
        const name = names.get(id)
        if (!name) throw new Error(`Missing area name: ${id}`)
        return { id, name: areaName(id, name) }
      })
      if (!controller.signal.aborted) setState({ options })
    }).catch(error => { if (!controller.signal.aborted) setState({ options: [], error: String(error) }) })
    return () => controller.abort()
  }, [attempt, mode])

  if (mode === 'local') return <LocalScope />
  if (mode === 'demo') return <span className="rounded-control border border-dashed border-mist px-2 py-1 text-xs text-white">DEMO data · fictitious areas</span>

  const selected = params.get('mapRegion') || (mode === 'pilot' ? 'PE-UCA' : 'PE')
  const known = state.options.some(option => option.id === selected)
  return <div className="flex min-w-0 items-center gap-3">
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-mist">
      <span className="sr-only lg:not-sr-only">Area</span>
      <span className="relative block min-w-0 w-full max-w-[16rem] flex-1">
        <select aria-label="Area" className={selectClass} value={selected} disabled={!state.options.length} onChange={event => {
          const next = new URLSearchParams(params), id = event.target.value
          next.set('mapRegion', id)
          if (id === 'PE-UCA') next.set('data', 'pilot'); else next.delete('data')
          navigate({ pathname: location.pathname, search: `?${next}`, hash: location.hash })
        }}>
          {!state.options.length && !state.error && <option value={selected}>Loading areas…</option>}
          {state.options.length > 0 && !known && selected !== 'PE-UCA' && <option value={selected}>Unknown area: {selected}</option>}
          {state.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          {mode === 'pilot' && <option value="PE-UCA">Pilot v1.0 · Ucayali</option>}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-mist" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </span>
    </label>
    <span className="hidden lg:contents"><ScopeLinks /></span>
    {state.error && <div role="alert" className="flex items-center gap-2 text-xs text-white">
      <span className="hidden sm:inline">Couldn't load the list of areas.</span><span className="sm:hidden">Areas unavailable.</span>
      <button type="button" className="cursor-pointer rounded-control border border-rule bg-transparent px-2 py-1 text-xs text-white" onClick={() => { setState({ options: [] }); setAttempt(attempt + 1) }}>Retry</button>
      <TechnicalDetail detail={state.error} />
    </div>}
  </div>
}

/** Enlaces de salida del ámbito: volver a Perú desde el piloto o My region, y cambiar de región local.
 *  En escritorio van junto al selector; en móvil, dentro del menú. */
export function ScopeLinks() {
  const [params] = useSearchParams(), location = useLocation()
  const mode = datasetMode(params)
  if (mode !== 'pilot' && mode !== 'local') return null
  const peru = new URLSearchParams(params)
  peru.delete('data'); peru.delete('mapRegion')
  const search = peru.size ? `?${peru}` : ''
  return <>
    {mode === 'local' && <Link className={linkClass} to={ROUTES.myRegion}>Change region</Link>}
    <Link className={linkClass} to={{ pathname: location.pathname, search, hash: location.hash }}>Back to Peru</Link>
  </>
}

/** My region: el conjunto procesado o cargado en este navegador. Siempre marcado como exploratorio. */
function LocalScope() {
  const [name, setName] = useState<string | null | undefined>(undefined)
  useEffect(() => { void leerConjunto().then(set => setName(set ? set.nombre : null)) }, [])
  return <div className="flex min-w-0 items-center gap-3 text-sm">
    <span className="flex min-w-0 items-center gap-2 rounded-control border border-dashed border-mist px-2 py-1 text-white">
      <span className="size-2 shrink-0 rounded-full bg-ember" aria-hidden="true" />
      <span className="truncate">My region{name ? ` · ${name}` : ''}</span>
      <em className="not-italic text-mist">Exploratory</em>
    </span>
    {name === null && <span role="alert" className="text-xs text-white">No My region data in this browser.</span>}
    <span className="hidden lg:contents"><ScopeLinks /></span>
  </div>
}
