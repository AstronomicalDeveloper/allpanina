import { useEffect, useMemo, useRef, useState } from 'react'
import { cargarIndice, cargarRegiones, nombrePais } from '../../services/region/mundo'
import type { IndiceMundo, Pais, RegionMundo } from '../../services/region/mundo'
import { RegionShape } from '../../services/region/polygon'
import { zonaPorLongitud } from '../../services/region/pipeline'
import { LocalDay } from '../../services/region/localDay'
import { borrarConjunto, guardarConjunto, leerConjunto } from '../../services/region/store'
import type { ConjuntoLocal } from '../../services/region/store'
import { escribirZip } from '../../services/region/zip'
import { importarResultado } from '../../services/region/importar'
import type { Pedido, Respuesta } from '../../services/region/region.worker'
import { Button, ButtonLink as LinkButton, Notice, PageHeader } from '../../ui'
import { englishWarning } from './regionCopy'

type Resumen = Extract<Respuesta, { tipo: 'listo' }>['resumen']
type Estado = { fase: 'inicio' } | { fase: 'procesando'; etapa: string; fraccion: number } | { fase: 'listo'; resumen: Resumen; archivos: Record<string, string> } | { fase: 'error'; mensaje: string }
type Fuente = 'archivos' | 'mapkey'
const FIRMS_BASE = (import.meta.env?.VITE_FIRMS_BASE as string | undefined) || 'https://firms.modaps.eosdis.nasa.gov'
const ZONAS: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone') } catch { return [] } })()
const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d })
const mb = (b: number) => `${fmt(b / 1e6, 1)} MB`
const enlace = (ruta: string, id: string) => `${ruta}?${new URLSearchParams({ data: 'local', mapRegion: id })}`

export default function RegionPage() {
  const [indice, setIndice] = useState<IndiceMundo | null | 'error'>(null)
  const [pais, setPais] = useState<Pais | null>(null)
  const [regiones, setRegiones] = useState<RegionMundo[] | 'cargando' | 'error'>([])
  const [errorIndice, setErrorIndice] = useState('')
  const [errorRegiones, setErrorRegiones] = useState('')
  const [errorPoligono, setErrorPoligono] = useState('')
  const [intento, setIntento] = useState(0)
  const [region, setRegion] = useState<RegionMundo | null>(null)
  const [propio, setPropio] = useState<{ nombre: string; geometry: unknown } | null>(null)
  const [modoPropio, setModoPropio] = useState(false)
  const [zonaManual, setZona] = useState<string | null>(null)
  const [fuente, setFuente] = useState<Fuente>('archivos')
  const [archivos, setArchivos] = useState<{ file: File; sensor: string }[]>([])
  const [mapKey, setMapKey] = useState('')
  const [desde, setDesde] = useState('2013-01-01'), [hasta, setHasta] = useState('2026-07-31')
  const [estado, setEstado] = useState<Estado>({ fase: 'inicio' })
  const [guardado, setGuardado] = useState<ConjuntoLocal | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const worker = useRef<Worker | null>(null)

  useEffect(() => {
    const c = new AbortController()
    cargarIndice(c.signal).then(setIndice).catch(e => { if (!c.signal.aborted) { setErrorIndice(e instanceof Error ? e.message : String(e)); setIndice('error') } })
    return () => c.abort()
  }, [intento])
  useEffect(() => { void leerConjunto().then(setGuardado) }, [])
  useEffect(() => () => worker.current?.terminate(), [])
  useEffect(() => {
    if (!pais) return
    const c = new AbortController()
    cargarRegiones(pais, c.signal).then(setRegiones).catch(e => { if (!c.signal.aborted) { setErrorRegiones(e instanceof Error ? e.message : String(e)); setRegiones('error') } })
    return () => c.abort()
  }, [pais, intento])
  function elegirPais(p: Pais | null) { setPais(p); setRegion(null); setZona(null); setErrorRegiones(''); setRegiones(p ? 'cargando' : []) }
  function reintentar() { setErrorIndice(''); setErrorRegiones(''); if (indice === 'error') setIndice(null); if (pais) setRegiones('cargando'); setIntento(i => i + 1) }

  const paises = useMemo(() => indice && indice !== 'error' ? [...indice.paises].map(p => ({ ...p, etiqueta: nombrePais(p) })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'en')) : [], [indice])
  const elegida = modoPropio ? propio : region
  const [forma, errorForma] = useMemo((): [RegionShape | null, string] => { try { return [elegida ? RegionShape.fromGeoJson(elegida.geometry) : null, ''] } catch (e) { return [null, e instanceof Error ? e.message : String(e)] } }, [elegida])
  const nombreRegion = modoPropio ? propio?.nombre ?? '' : region ? `${region.nombre}${pais ? `, ${nombrePais(pais)}` : ''}` : ''
  const regionId = modoPropio ? (propio?.nombre ?? 'MY-REGION').normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).toUpperCase() || 'MY-REGION' : region?.id ?? ''
  const zona = zonaManual ?? (forma ? (modoPropio ? null : region?.zona_horaria) || zonaPorLongitud((forma.bbox[0] + forma.bbox[2]) / 2) : '')

  const bboxTxt = forma ? forma.bbox.map(v => fmt(v, 4).replace(',', '.')).join(', ') : ''
  // Requisitos de cada paso: el siguiente se habilita apenas se cumple el anterior.
  const zonaValida = !!zona && LocalDay.valid(zona)
  const regionLista = !!forma && zonaValida
  const conSensor = (s: string) => archivos.some(a => a.sensor === s || a.sensor === 'ZIP')
  const mapKeyValida = /^[0-9A-Za-z]{32}$/.test(mapKey)
  const fechasValidas = !!desde && !!hasta && desde <= hasta
  const faltanDatos: string[] = fuente === 'archivos'
    ? [...(!archivos.length ? ['add the FIRMS files'] : []), ...(archivos.length && !conSensor('MODIS') ? ['the MODIS file is missing'] : []), ...(archivos.length && !conSensor('VIIRS') ? ['the VIIRS file is missing'] : [])]
    : [...(!mapKeyValida ? ['enter your 32-character MAP_KEY'] : []), ...(!fechasValidas ? ['check the dates: “From” must be on or before “To”'] : [])]
  const tieneDatos = faltanDatos.length === 0
  const listo = regionLista && tieneDatos && estado.fase !== 'procesando'
  const pasoDatosBloqueado = !regionLista || estado.fase === 'procesando'
  const motivoPaso2 = !forma ? 'First choose a country and a region (steps 1 and 2), or upload your own polygon.' : !zonaValida ? 'Check the time zone in step 2: it is not a valid name (for example, America/Lima).' : ''
  const motivoPaso3 = !regionLista ? 'Complete step 2: choose the region.' : !tieneDatos ? `Complete step 3: ${faltanDatos.join('; ')}.` : ''

  async function agregar(lista: FileList | File[]) {
    if (pasoDatosBloqueado) return
    const nuevos = await Promise.all(Array.from(lista).filter(f => /\.(csv|zip)$/i.test(f.name)).map(async file => {
      if (/\.zip$/i.test(file.name)) return { file, sensor: 'ZIP' }
      const cab = await file.slice(0, 4096).text()
      const sensor = /,MODIS,|,Terra,|,Aqua,/.test(cab) ? 'MODIS' : /,VIIRS,|,N,|,SNPP,/.test(cab) ? 'VIIRS' : '¿?'
      return { file, sensor }
    }))
    setArchivos(prev => [...prev.filter(p => !nuevos.some(n => n.file.name === p.file.name)), ...nuevos])
  }

  async function subirPoligono(file: File) {
    try {
      const geo = JSON.parse(await file.text())
      RegionShape.fromGeoJson(geo)
      setErrorPoligono(''); setZona(null); setPropio({ nombre: file.name.replace(/\.(geo)?json$/i, ''), geometry: geo })
    } catch (e) { setPropio(null); setErrorPoligono(`Could not use ${file.name}: ${e instanceof SyntaxError ? 'it is not valid JSON.' : e instanceof Error ? e.message : e}`) }
  }

  function procesar() {
    if (!forma || !elegida || !listo) return
    worker.current?.terminate()
    let w: Worker
    try { w = new Worker(new URL('../../services/region/region.worker.ts', import.meta.url), { type: 'module' }) }
    catch { setEstado({ fase: 'error', mensaje: 'The Web Worker could not start. Check that your browser allows local processing.' }); return }
    worker.current = w
    setEstado({ fase: 'procesando', etapa: 'Preparing', fraccion: 0 })
    w.onmessage = async (ev: MessageEvent<Respuesta>) => {
      const r = ev.data
      if (r.tipo === 'progreso') setEstado({ fase: 'procesando', etapa: r.etapa, fraccion: r.fraccion })
      else if (r.tipo === 'error') { setEstado({ fase: 'error', mensaje: r.mensaje }); w.terminate() }
      else {
        const conjunto = { archivos: r.archivos, region_id: r.resumen.region_id, nombre: r.resumen.nombre, guardado: new Date().toISOString() }
        const advertencia = await guardarConjunto(conjunto); setAviso(advertencia); setGuardado(conjunto)
        setEstado({ fase: 'listo', resumen: r.resumen, archivos: r.archivos }); w.terminate()
      }
    }
    w.onerror = ev => { w.terminate(); setEstado({ fase: 'error', mensaje: ev.message || 'Processing stopped (not enough memory?).' }) }
    const pedido: Pedido = {
      archivos: fuente === 'archivos' ? archivos.map(a => a.file) : undefined,
      descarga: fuente === 'mapkey' ? { mapKey, desde, hasta, base: FIRMS_BASE } : undefined,
      opciones: { region_id: regionId, nombre: nombreRegion, zona_horaria: zona, poligono: elegida.geometry, bbox: forma.bbox },
    }
    w.postMessage(pedido)
  }

  function descargar(archivosZip: Record<string, string>, id: string) {
    const url = URL.createObjectURL(escribirZip(archivosZip)), a = document.createElement('a')
    a.href = url; a.download = `allpanina_${id}.zip`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function subirResultado(file: File) {
    setAviso(null)
    try { const c = await importarResultado(file); const advertencia = await guardarConjunto(c); setGuardado(c); setAviso(advertencia ?? `Done: ${c.nombre} is loaded. Open it in the Calendar or the Map.`) }
    catch (e) { setAviso(`The result could not be loaded: ${e instanceof Error ? e.message : e}`) }
  }

  const resultado = estado.fase === 'listo'
  const pasos: { n: number; titulo: string; hecho: boolean; activo: boolean }[] = [
    { n: 1, titulo: 'Country', hecho: modoPropio ? !!propio : !!pais, activo: !modoPropio && !pais },
    { n: 2, titulo: 'Region', hecho: regionLista, activo: (modoPropio || !!pais) && !regionLista },
    { n: 3, titulo: 'Data', hecho: regionLista && tieneDatos, activo: regionLista && !tieneDatos },
    { n: 4, titulo: 'Processing', hecho: resultado, activo: listo && !resultado || estado.fase === 'procesando' || estado.fase === 'error' },
    { n: 5, titulo: 'Results', hecho: resultado, activo: resultado },
  ]
  const actual = pasos.find(p => p.activo)?.n ?? (resultado ? 5 : 1)
  const tarjeta = (n: number, abierto: boolean) => `region-card${abierto ? '' : ' is-locked'}${actual === n ? ' is-current' : ''}`
  const titulo = (n: number, texto: string, hecho: boolean) => <h2 id={`step-${n}-title`}><span className={`region-step-n${hecho ? ' is-done' : ''}`} aria-hidden="true">{hecho ? '✓' : n}</span> {texto}<span className="region-sr-only">{hecho ? ' (completed)' : ''}</span></h2>

  return <div className="region-page mx-auto w-full max-w-[1280px] px-4 md:px-10">
    <p className="mb-3 mt-0 text-xs font-semibold uppercase tracking-[0.08em] text-cinder">My region · exploratory</p>
    <PageHeader className="region-hero"
      title="Explore heat detections in your region"
      description={<>Choose a region, bring the NASA FIRMS data and AllpaNina builds the calendar and the map with the same method used for Peru. <strong>Everything runs on your computer:</strong> your files are not uploaded to any server.</>} />
    <p className="region-hero-note">The selector lists the countries published on this server; for other places you can upload a GeoJSON polygon.</p>

    <div className="region-layout">
      <div className="region-steps">
        <section id="step-1" className={tarjeta(1, true)} aria-labelledby="step-1-title">
          {titulo(1, 'Country', pasos[0].hecho)}
          {!modoPropio ? <>
            {indice === 'error' && <Notice tone="error" title="The country list could not be loaded.">{errorIndice} <button className="region-link" onClick={reintentar}>Retry</button> or <button className="region-link" onClick={() => setModoPropio(true)}>upload your own polygon</button>.</Notice>}
            <label className="region-field"><span>Country {paises.length > 0 && <small>({paises.length} available)</small>}</span>
              <select value={pais?.iso3 ?? ''} disabled={!paises.length} onChange={e => elegirPais(paises.find(p => p.iso3 === e.target.value) ?? null)}>
                <option value="">{indice === null ? 'Loading countries…' : 'Choose a country'}</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.etiqueta}</option>)}
              </select></label>
            <button className="region-link" onClick={() => setModoPropio(true)}>Region not listed? Use your own polygon (GeoJSON)</button>
          </> : <>
            <p className="region-note">You are using your own polygon instead of a published country.</p>
            <button className="region-link" onClick={() => setModoPropio(false)}>Back to the country list</button>
          </>}
        </section>

        <section id="step-2" className={tarjeta(2, modoPropio || !!pais)} aria-labelledby="step-2-title">
          {titulo(2, 'Region', regionLista)}
          {!modoPropio ? <>
            {regiones === 'error' && <Notice tone="error" title="The regions could not be loaded.">{errorRegiones} <button className="region-link" onClick={reintentar}>Retry</button> or <button className="region-link" onClick={() => setModoPropio(true)}>upload your own polygon</button>.</Notice>}
            <label className="region-field"><span>Region (first level: department, province, state…) {Array.isArray(regiones) && regiones.length > 0 && <small>({regiones.length})</small>}</span>
              <select value={region?.id ?? ''} disabled={!Array.isArray(regiones) || !regiones.length} onChange={e => { setZona(null); setRegion(Array.isArray(regiones) ? regiones.find(r => r.id === e.target.value) ?? null : null) }}>
                <option value="">{regiones === 'cargando' ? 'Loading regions…' : regiones === 'error' ? 'Could not be loaded' : pais ? 'Choose a region' : 'Choose a country first'}</option>
                {Array.isArray(regiones) && regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select></label>
          </> : <>
            <label className="region-drop region-drop--small"><input type="file" accept=".geojson,.json,application/geo+json" aria-label="Region polygon (GeoJSON)" onChange={e => e.target.files?.[0] && void subirPoligono(e.target.files[0])} />
              <span>{propio ? <>Polygon: <strong>{propio.nombre}</strong></> : 'Choose a GeoJSON file (WGS84) with the outline of your region'}</span></label>
            {errorPoligono && <Notice tone="error">{errorPoligono}</Notice>}
          </>}
          {forma && <dl className="region-facts">
            <div><dt>Region</dt><dd>{nombreRegion}</dd></div>
            <div><dt>Code</dt><dd>{regionId}</dd></div>
            <div><dt>Area</dt><dd>{fmt(forma.area_km2)} km²</dd></div>
            <div><dt>Map</dt><dd>{forma.area_km2 <= 150000 ? '1 km' : '10 km'} cells</dd></div>
            <div className="region-facts-wide"><dt><label htmlFor="zona">Calendar time zone</label></dt><dd>
              <input id="zona" list="zonas" value={zona} onChange={e => setZona(e.target.value)} spellCheck={false} aria-invalid={!zonaValida} aria-describedby="zona-ayuda" />
              <datalist id="zonas">{ZONAS.map(z => <option key={z} value={z} />)}</datalist>
              <small id="zona-ayuda">{zonaValida ? 'Sets the local day each detection belongs to.' : 'Time zone not recognised: choose one from the list (for example, America/Lima).'}</small></dd></div>
          </dl>}
          {errorForma && <Notice tone="error" title="The outline of this region cannot be used.">{errorForma} The published boundaries are damaged for this region: <button className="region-link" onClick={() => setModoPropio(true)}>use your own polygon</button>.</Notice>}
          {regionLista && <p className="region-next" role="status">Ready. Next: bring the NASA FIRMS data (step 3).</p>}
        </section>

        <section id="step-3" className={tarjeta(3, !pasoDatosBloqueado)} aria-labelledby="step-3-title" aria-describedby={motivoPaso2 ? 'step-3-reason' : undefined}>
          {titulo(3, 'Data from NASA FIRMS', regionLista && tieneDatos)}
          {motivoPaso2 && <p className="region-lock-note" id="step-3-reason">{motivoPaso2}</p>}
          <fieldset className="region-fieldset" disabled={pasoDatosBloqueado}>
          <legend className="region-sr-only">Source of the FIRMS data</legend>
          <div className="region-tabs" role="radiogroup" aria-label="Data source">
            <button role="radio" aria-checked={fuente === 'archivos'} onClick={() => setFuente('archivos')}>I have the files</button>
            <button role="radio" aria-checked={fuente === 'mapkey'} onClick={() => setFuente('mapkey')}>Download with my MAP_KEY</button>
          </div>
          {fuente === 'archivos' ? <>
            <label className={`region-drop${arrastrando ? ' is-over' : ''}${pasoDatosBloqueado ? ' is-disabled' : ''}`} aria-disabled={pasoDatosBloqueado}
              onDragOver={e => { e.preventDefault(); if (pasoDatosBloqueado) { e.dataTransfer.dropEffect = 'none'; return } setArrastrando(true) }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={e => { e.preventDefault(); setArrastrando(false); if (!pasoDatosBloqueado) void agregar(e.dataTransfer.files) }}>
              <input type="file" multiple accept=".csv,.zip" aria-label="FIRMS files (CSV or .zip)" onChange={e => e.target.files && void agregar(e.target.files)} />
              <span className="region-drop-icon" aria-hidden="true">⇪</span>
              <span><strong>Drop here</strong> the CSV files or the .zip that FIRMS sent you, or click to choose them</span>
              <small>MODIS (fire_archive_M-C61…) and VIIRS S-NPP (fire_archive_SV-C2…)</small>
            </label>
            {!!archivos.length && <ul className="region-files" aria-label="Files added">{archivos.map(a => <li key={a.file.name}>
              <span className={`region-badge region-badge--${a.sensor === '¿?' ? 'unknown' : a.sensor.toLowerCase()}`}>{a.sensor === '¿?' ? 'Unknown' : a.sensor}</span><span className="region-file-name">{a.file.name}</span><span>{mb(a.file.size)}</span>
              <button aria-label={`Remove ${a.file.name}`} onClick={() => setArchivos(archivos.filter(x => x !== a))}>×</button></li>)}</ul>}
            <details className="region-help"><summary>How do I get the files?</summary><ol>
              <li>Go to <a href="https://firms.modaps.eosdis.nasa.gov/download/" target="_blank" rel="noreferrer">FIRMS · Archive Download</a> (it asks for a free NASA Earthdata account).</li>
              <li>Request <strong>MODIS C6.1</strong> and <strong>VIIRS S-NPP 375 m</strong>, in <strong>CSV</strong> format, from 2013-01-01 to 2026-07-31.</li>
              <li>As the area, use a box with these coordinates (west, south, east, north): {forma ? <code className="region-code">{bboxTxt} <button className="region-link" onClick={() => void navigator.clipboard?.writeText(bboxTxt)}>Copy</button></code> : 'choose the region first'}.</li>
              <li>FIRMS emails you the files; upload them here as they are (the .zip works too).</li></ol></details>
          </> : <div className="region-mapkey">
            <label className="region-field"><span>FIRMS MAP_KEY <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer">(request one for free)</a></span>
              <input type="password" autoComplete="off" value={mapKey} onChange={e => setMapKey(e.target.value.trim())} placeholder="32 characters" aria-invalid={!!mapKey && !mapKeyValida} /></label>
            <div className="region-grid2">
              <label className="region-field"><span>From</span><input type="date" value={desde} min="2012-01-20" onChange={e => setDesde(e.target.value)} /></label>
              <label className="region-field"><span>To</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label></div>
            {!fechasValidas && <Notice tone="error">“From” must be on or before “To”.</Notice>}
            <p className="region-note">The MAP_KEY is not stored. The download depends on FIRMS availability and on CORS. If it fails, download the CSV files from FIRMS and upload them here. If a proxy is configured, the key also passes through that server.</p>
          </div>}
          </fieldset>
          {regionLista && fuente === 'archivos' && archivos.length > 0 && faltanDatos.length > 0 && <p className="region-lock-note" role="status">To continue: {faltanDatos.join('; ')}.</p>}
          {regionLista && tieneDatos && <p className="region-next" role="status">Ready. Next: process the data (step 4).</p>}
        </section>

        <section id="step-4" className={tarjeta(4, listo || estado.fase !== 'inicio')} aria-labelledby="step-4-title">
          {titulo(4, 'Processing', resultado)}
          {motivoPaso3 && estado.fase !== 'procesando' && <p className="region-lock-note" id="step-4-reason">{motivoPaso3}</p>}
          {estado.fase !== 'procesando' && <Button disabled={!listo} aria-describedby={motivoPaso3 ? 'step-4-reason' : undefined} onClick={procesar}>{resultado ? 'Process again' : 'Process on my computer'}</Button>}
          {estado.fase === 'procesando' && <div className="region-progress" role="status" aria-live="polite">
            <div className="region-bar" role="progressbar" aria-label="Processing progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(estado.fraccion * 100)}><span style={{ width: `${Math.round(estado.fraccion * 100)}%` }} /></div>
            <p>{estado.etapa}… <strong>{Math.round(estado.fraccion * 100)}%</strong></p>
            <Button variant="secondary" size="sm" onClick={() => { worker.current?.terminate(); setEstado({ fase: 'inicio' }) }}>Cancel</Button></div>}
          {estado.fase === 'error' && <Notice tone="error" title="Processing failed.">{estado.mensaje}</Notice>}
        </section>

        <section id="step-5" className={tarjeta(5, resultado)} aria-labelledby="step-5-title">
          {titulo(5, 'Results', resultado)}
          {resultado ? <Resultado resumen={estado.resumen} onDescargar={() => descargar(estado.archivos, estado.resumen.region_id)} />
            : <p className="region-empty">Results appear here after processing: the region summary, the local κ factor, warnings, and links to the Calendar and the Map.</p>}
        </section>
      </div>

      <aside className="region-aside" aria-label="Saved results">
        <section className="region-card region-card--soft" aria-labelledby="upload-title">
          <h2 id="upload-title">Already have a result?</h2>
          <p>Upload the <code>.zip</code> you downloaded before (or that someone shared with you) and view it in the Calendar and the Map.</p>
          <label className="region-drop region-drop--small"><input type="file" accept=".zip" aria-label="Result file (.zip)" onChange={e => e.target.files?.[0] && void subirResultado(e.target.files[0])} /><span>Choose a result (.zip)</span></label>
          {aviso && <p className="region-note" role="status">{aviso}</p>}
        </section>
        {guardado && <section className="region-card region-card--saved" aria-labelledby="saved-title">
          <h2 id="saved-title">Result in this browser</h2>
          <p><strong>{guardado.nombre}</strong><br /><small>{guardado.region_id} · {new Date(guardado.guardado).toLocaleString('en-US')}</small></p>
          <div className="region-actions">
            <LinkButton variant="secondary" size="sm" to={enlace('/calendar', guardado.region_id)}>Calendar</LinkButton>
            <LinkButton variant="secondary" size="sm" to={enlace('/map', guardado.region_id)}>Map</LinkButton>
          </div>
          <div className="region-actions">
            <button className="region-link" onClick={() => descargar(guardado.archivos, guardado.region_id)}>Download .zip</button>
            <button className="region-link" onClick={() => void borrarConjunto().then(() => setGuardado(null)).catch(() => setAviso('The saved result could not be deleted. Try again.'))}>Delete</button>
          </div>
        </section>}
        <p className="region-fineprint">Exploratory results: the κ factor is computed automatically for your region and has not been reviewed by the team, unlike Ucayali and Peru. A thermal detection is not a confirmed fire. Administrative boundaries: geoBoundaries (CC BY 4.0).</p>
      </aside>
    </div>
  </div>
}

function Resultado({ resumen, onDescargar }: { resumen: Resumen; onDescargar: () => void }) {
  return <div className="region-result">
    <div className="region-result-head"><span className="region-result-ok" aria-hidden="true">✓</span><div><h3>{resumen.nombre}</h3><p>{resumen.periodo.desde} to {resumen.periodo.hasta} · time zone {resumen.zona_horaria}</p></div></div>
    <dl className="region-stats">
      <div><dt>B1 calibration</dt><dd>{resumen.b1_disponible ? 'Available' : 'Not available'}</dd></div>
      <div><dt>Local κ factor</dt><dd>{resumen.kappa === null ? '—' : resumen.kappa.toFixed(3)}</dd></div>
      <div><dt>Map cell</dt><dd>{resumen.celda_mapa_km} km</dd></div>
    </dl>
    {!!resumen.advertencias.length && <ul className="region-warnings" aria-label="Warnings">{resumen.advertencias.map(a => <li key={a}>{englishWarning(a)}</li>)}</ul>}
    <div className="region-actions">
      <LinkButton to={enlace('/calendar', resumen.region_id)}>View calendar</LinkButton>
      <LinkButton variant="secondary" to={enlace('/map', resumen.region_id)}>View map</LinkButton>
      <Button variant="secondary" onClick={onDescargar}>Download result (.zip)</Button>
    </div>
  </div>
}
