import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { loadManifest, loadMethod, safelyLoad } from '../services/data/loaders.ts'
import type { LoadResult } from '../services/data/loaders.ts'
import type { Manifest, MethodInfo } from '../types/data.ts'

interface Context {
  manifest: LoadResult<Manifest>
  method: LoadResult<MethodInfo>
}

/** Read-only publication context; never changes the exploration selection. */
export default function AppHeader({ dataRoot, children, view = 'calendar' }: { dataRoot: string; children: ReactNode; view?: 'calendar' | 'map' | 'method' }) {
  const headerRef = useRef<HTMLElement>(null)
  const sourcesRef = useRef<HTMLDetailsElement>(null)
  const root = dataRoot.replace(/\/$/, '')
  const [context, setContext] = useState<Context | null>(null)
  const [attempt, setAttempt] = useState(0)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header || typeof ResizeObserver === 'undefined') return
    // Keep cartographic controls clear of the actual header, including wrapped metadata.
    const measure = () => header.parentElement?.style.setProperty('--app-header-height', `${header.offsetHeight}px`)
    const observer = new ResizeObserver(measure)
    measure()
    observer.observe(header)
    return () => {
      observer.disconnect()
      header.parentElement?.style.removeProperty('--app-header-height')
    }
  }, [])
  useEffect(() => {
    if (sourcesRef.current) sourcesRef.current.open = false
  }, [view])
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const menu = sourcesRef.current
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      safelyLoad(() => loadManifest(`${root}/manifest.json`, controller.signal)),
      safelyLoad(() => loadMethod(`${root}/method.json`, controller.signal)),
    ]).then(([manifest, method]) => {
      if (!controller.signal.aborted) setContext({ manifest, method })
    })
    return () => controller.abort()
  }, [root, attempt])

  const manifest = context?.manifest.ok ? context.manifest.data : null
  const method = context?.method.ok ? context.method.data : null
  // A friendly name is usable only when it belongs to this manifest's region.
  const regionName = method?.region_id === manifest?.region_id ? method?.region?.split('. ')[0] : undefined

  return <header ref={headerRef} className={`app-header app-header--${view === 'map' ? 'overlay' : 'solid'}`}>
    <a className="app-skip-link" href="#app-content">Saltar al contenido</a>
    <div className="app-header-top">
      <div className="app-wordmark">
        <svg className="app-brand-symbol" viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M17 3c1 8 9 10 9 19a11 11 0 0 1-22 0c0-5 3-9 7-12 0 5 1 8 4 9 4-5 3-10 2-16Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M16 32c-6-5-6-10 0-15 0 6 5 8 0 15Z" fill="currentColor" /></svg>
        <div>
          <strong>AllpaNina</strong>
          <p>Exploración histórica de detecciones térmicas</p>
        </div>
      </div>
      {children}
      <details ref={sourcesRef} className="app-sources" onKeyDown={event => {
        if (event.key === 'Escape' && sourcesRef.current?.open) {
          sourcesRef.current.open = false
          sourcesRef.current.querySelector('summary')?.focus()
          event.preventDefault()
        }
      }}>
        <summary aria-label="Acerca de / Fuentes" title="Acerca de / Fuentes"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span className="app-visually-hidden">Acerca de / Fuentes</span></summary>
        <div className="app-sources-panel">
          <h2>Acerca de AllpaNina</h2>
          <p>Explora cuándo y dónde se registraron detecciones térmicas y cómo se compararon los sensores. No son incendios confirmados ni superficie quemada.</p>
          {manifest && <dl>
            <div><dt>Producto publicado</dt><dd>{manifest.producto}</dd></div>
            <div><dt>Entrega generada</dt><dd><time dateTime={manifest.generated_at}>{manifest.generated_at}</time></dd></div>
          </dl>}
          <p>La fecha de generación corresponde a la entrega, no a una observación. El período publicado no certifica cobertura completa.</p>
          <p className="ui-source-note">Metadatos: <a href={`${root}/manifest.json`}>manifest.json</a> · <a href={`${root}/method.json`}>method.json</a>. Las definiciones y limitaciones se presentan en Método.</p>
        </div>
      </details>
    </div>
    <div className="app-region-context" aria-live="polite">
      {root.endsWith('/demo') && <p className="app-demo-label">DATOS DEMO — NO SON OBSERVACIONES REALES</p>}
      {!context ? <p>Cargando contexto de la publicación…</p> : manifest ? <p>
        <span>Región piloto: <strong>{regionName ? `${regionName} (${manifest.region_id})` : manifest.region_id}</strong></span>
        <span>Serie publicada: <time dateTime={manifest.periodo.desde}>{manifest.periodo.desde}</time> — <time dateTime={manifest.periodo.hasta}>{manifest.periodo.hasta}</time></span>
      </p> : <p>Contexto de región y período no disponible: no se pudo leer manifest.json.</p>}
      {context && !context.method.ok && <p className="ui-source-note">Descripción de región no disponible: no se pudo leer method.json.</p>}
      {context && (!context.manifest.ok || !context.method.ok) && <button className="ui-button" type="button" onClick={() => { setContext(null); setAttempt(attempt + 1) }}>Reintentar contexto</button>}
    </div>
  </header>
}
