import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cargarIndice, cargarRegiones, nombrePais } from '../../services/region/mundo'
import type { IndiceMundo, Pais, RegionMundo } from '../../services/region/mundo'
import { RegionShape } from '../../services/region/polygon'
import { zonaPorLongitud } from '../../services/region/pipeline'
import { borrarConjunto, guardarConjunto, leerConjunto } from '../../services/region/store'
import type { ConjuntoLocal } from '../../services/region/store'
import { escribirZip, leerZip } from '../../services/region/zip'
import { parseMonthlySeries, validateManifest } from '../../services/data/validators'
import type { Pedido, Respuesta } from '../../services/region/region.worker'
import './region.css'

type Resumen = Extract<Respuesta, { tipo: 'listo' }>['resumen']
type Estado = { fase: 'inicio' } | { fase: 'procesando'; etapa: string; fraccion: number } | { fase: 'listo'; resumen: Resumen; archivos: Record<string, string> } | { fase: 'error'; mensaje: string }
type Fuente = 'archivos' | 'mapkey'
const FIRMS_BASE = (import.meta.env?.VITE_FIRMS_BASE as string | undefined) || 'https://firms.modaps.eosdis.nasa.gov'
const ZONAS: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone') } catch { return [] } })()
const fmt = (v: number, d = 0) => v.toLocaleString('es', { maximumFractionDigits: d })
const mb = (b: number) => `${fmt(b / 1e6, 1)} MB`
const enlace = (ruta: string, id: string) => `${ruta}?${new URLSearchParams({ data: 'local', mapRegion: id })}`

async function sha256(t: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Valida un .zip de resultado (manifiesto, hashes y serie) y lo guarda como Mi región. */
async function importarResultado(file: File): Promise<ConjuntoLocal> {
  const dentro = await leerZip(await file.arrayBuffer()), dec = new TextDecoder(), archivos: Record<string, string> = {}
  for (const [ruta, bytes] of Object.entries(dentro)) archivos[ruta.split('/').pop()!] = dec.decode(bytes)
  if (!archivos['manifest.json']) throw new Error('El .zip no tiene manifest.json: no parece un resultado de AllpaNina.')
  const manifest = validateManifest(JSON.parse(archivos['manifest.json']))
  if (manifest.contract_version === '1.1') throw new Error('Este es el conjunto nacional de Perú; ya está publicado en la web.')
  for (const n of manifest.files) {
    if (archivos[n] === undefined) throw new Error(`Falta ${n} dentro del .zip.`)
    if (manifest.hash[n] !== 'sha256:' + await sha256(archivos[n])) throw new Error(`${n} no coincide con su hash del manifiesto: el archivo fue modificado o está dañado.`)
  }
  parseMonthlySeries(archivos['monthly_series.csv'])
  let nombre = manifest.region_id
  try { nombre = JSON.parse(archivos['method.json']).region || nombre } catch { /* se usa el código */ }
  return { archivos, region_id: manifest.region_id, nombre, guardado: new Date().toISOString() }
}

export default function RegionPage() {
  const [indice, setIndice] = useState<IndiceMundo | null | 'error'>(null)
  const [pais, setPais] = useState<Pais | null>(null)
  const [regiones, setRegiones] = useState<RegionMundo[] | 'cargando' | 'error'>([])
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

  useEffect(() => { const c = new AbortController(); cargarIndice(c.signal).then(setIndice).catch(() => { if (!c.signal.aborted) setIndice('error') }); return () => c.abort() }, [])
  useEffect(() => { void leerConjunto().then(setGuardado) }, [])
  useEffect(() => () => worker.current?.terminate(), [])
  useEffect(() => {
    if (!pais) return
    const c = new AbortController()
    cargarRegiones(pais, c.signal).then(setRegiones).catch(() => { if (!c.signal.aborted) setRegiones('error') })
    return () => c.abort()
  }, [pais])
  function elegirPais(p: Pais | null) { setPais(p); setRegion(null); setZona(null); setRegiones(p ? 'cargando' : []) }

  const paises = useMemo(() => indice && indice !== 'error' ? [...indice.paises].map(p => ({ ...p, etiqueta: nombrePais(p) })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')) : [], [indice])
  const elegida = modoPropio ? propio : region
  const forma = useMemo(() => { try { return elegida ? RegionShape.fromGeoJson(elegida.geometry) : null } catch { return null } }, [elegida])
  const nombreRegion = modoPropio ? propio?.nombre ?? '' : region ? `${region.nombre}${pais ? `, ${nombrePais(pais)}` : ''}` : ''
  const regionId = modoPropio ? (propio?.nombre ?? 'MI-REGION').normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).toUpperCase() || 'MI-REGION' : region?.id ?? ''
  const zona = zonaManual ?? (forma ? (modoPropio ? null : region?.zona_horaria) || zonaPorLongitud((forma.bbox[0] + forma.bbox[2]) / 2) : '')

  const bboxTxt = forma ? forma.bbox.map(v => fmt(v, 4).replace(',', '.')).join(', ') : ''
  const tieneDatos = fuente === 'archivos' ? archivos.length > 0 : /^[0-9A-Za-z]{32}$/.test(mapKey)
  const listo = !!forma && !!zona && tieneDatos && estado.fase !== 'procesando'

  async function agregar(lista: FileList | File[]) {
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
      setZona(null); setPropio({ nombre: file.name.replace(/\.(geo)?json$/i, ''), geometry: geo })
    } catch (e) { setAviso(`No se pudo leer el polígono: ${e instanceof Error ? e.message : e}`) }
  }

  function procesar() {
    if (!forma || !elegida) return
    worker.current?.terminate()
    const w = new Worker(new URL('../../services/region/region.worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    setEstado({ fase: 'procesando', etapa: 'Preparando', fraccion: 0 })
    w.onmessage = async (ev: MessageEvent<Respuesta>) => {
      const r = ev.data
      if (r.tipo === 'progreso') setEstado({ fase: 'procesando', etapa: r.etapa, fraccion: r.fraccion })
      else if (r.tipo === 'error') { setEstado({ fase: 'error', mensaje: r.mensaje }); w.terminate() }
      else {
        const conjunto = { archivos: r.archivos, region_id: r.resumen.region_id, nombre: r.resumen.nombre, guardado: new Date().toISOString() }
        await guardarConjunto(conjunto); setGuardado(conjunto)
        setEstado({ fase: 'listo', resumen: r.resumen, archivos: r.archivos }); w.terminate()
      }
    }
    w.onerror = ev => setEstado({ fase: 'error', mensaje: ev.message || 'El procesamiento se detuvo (¿memoria insuficiente?).' })
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
    try { const c = await importarResultado(file); await guardarConjunto(c); setGuardado(c); setAviso(`Listo: ${c.nombre} quedó cargado. Ábrelo en el Calendario o el Mapa.`) }
    catch (e) { setAviso(`No se pudo cargar el resultado: ${e instanceof Error ? e.message : e}`) }
  }

  const paso = (n: number, hecho: boolean) => <span className={`region-step-n${hecho ? ' is-done' : ''}`} aria-hidden="true">{hecho ? '✓' : n}</span>

  return <div className="region-page">
    <header className="region-hero">
      <p className="region-kicker">Mi región · exploratorio</p>
      <h1>Focos de calor de cualquier lugar del mundo</h1>
      <p>Elige tu región, trae los datos de NASA FIRMS y AllpaNina arma el calendario y el mapa con el mismo método que usamos en Perú. <strong>Todo se procesa en tu computadora:</strong> tus archivos no se suben a ningún servidor.</p>
    </header>

    <div className="region-layout">
      <div className="region-steps">
        <section className="region-card" aria-labelledby="paso1">
          <h2 id="paso1">{paso(1, !!forma)} ¿Qué región quieres ver?</h2>
          {!modoPropio ? <>
            {indice === 'error' && <p className="region-note">La lista de países todavía no está publicada en este servidor. Puedes <button className="region-link" onClick={() => setModoPropio(true)}>subir tu propio polígono</button>.</p>}
            <div className="region-grid2">
              <label className="region-field"><span>País</span>
                <select value={pais?.iso3 ?? ''} disabled={!paises.length} onChange={e => elegirPais(paises.find(p => p.iso3 === e.target.value) ?? null)}>
                  <option value="">{indice === null ? 'Cargando países…' : 'Elige un país'}</option>
                  {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.etiqueta}</option>)}
                </select></label>
              <label className="region-field"><span>Región (primer nivel: departamento, provincia, estado…)</span>
                <select value={region?.id ?? ''} disabled={!Array.isArray(regiones) || !regiones.length} onChange={e => { setZona(null); setRegion(Array.isArray(regiones) ? regiones.find(r => r.id === e.target.value) ?? null : null) }}>
                  <option value="">{regiones === 'cargando' ? 'Cargando regiones…' : regiones === 'error' ? 'No se pudieron cargar' : pais ? 'Elige una región' : 'Primero elige un país'}</option>
                  {Array.isArray(regiones) && regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select></label>
            </div>
            <button className="region-link" onClick={() => setModoPropio(true)}>¿Tu región no está? Usa tu propio polígono (GeoJSON)</button>
          </> : <>
            <label className="region-drop region-drop--small"><input type="file" accept=".geojson,.json,application/geo+json" onChange={e => e.target.files?.[0] && void subirPoligono(e.target.files[0])} />
              <span>{propio ? <>Polígono: <strong>{propio.nombre}</strong></> : 'Elige un archivo GeoJSON (WGS84) con el contorno de tu región'}</span></label>
            <button className="region-link" onClick={() => setModoPropio(false)}>Volver a la lista de países</button>
          </>}
          {forma && <dl className="region-facts">
            <div><dt>Región</dt><dd>{nombreRegion}</dd></div>
            <div><dt>Código</dt><dd>{regionId}</dd></div>
            <div><dt>Superficie</dt><dd>{fmt(forma.area_km2)} km²</dd></div>
            <div><dt>Mapa</dt><dd>celdas de {forma.area_km2 <= 150000 ? '1 km' : '10 km'}</dd></div>
            <div className="region-facts-wide"><dt><label htmlFor="zona">Zona horaria del calendario</label></dt><dd>
              <input id="zona" list="zonas" value={zona} onChange={e => setZona(e.target.value)} spellCheck={false} />
              <datalist id="zonas">{ZONAS.map(z => <option key={z} value={z} />)}</datalist>
              <small>Define a qué día local pertenece cada detección.</small></dd></div>
          </dl>}
        </section>

        <section className={`region-card${forma ? '' : ' is-locked'}`} aria-labelledby="paso2">
          <h2 id="paso2">{paso(2, tieneDatos)} Datos de NASA FIRMS</h2>
          <div className="region-tabs" role="tablist" aria-label="Origen de los datos">
            <button role="tab" aria-selected={fuente === 'archivos'} onClick={() => setFuente('archivos')}>Tengo los archivos</button>
            <button role="tab" aria-selected={fuente === 'mapkey'} onClick={() => setFuente('mapkey')}>Descargar con mi MAP_KEY</button>
          </div>
          {fuente === 'archivos' ? <>
            <label className={`region-drop${arrastrando ? ' is-over' : ''}`} onDragOver={e => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)} onDrop={e => { e.preventDefault(); setArrastrando(false); void agregar(e.dataTransfer.files) }}>
              <input type="file" multiple accept=".csv,.zip" onChange={e => e.target.files && void agregar(e.target.files)} />
              <span className="region-drop-icon" aria-hidden="true">⇪</span>
              <span><strong>Arrastra aquí</strong> los CSV o el .zip que te envió FIRMS, o haz clic para elegirlos</span>
              <small>MODIS (fire_archive_M-C61…) y VIIRS S-NPP (fire_archive_SV-C2…)</small>
            </label>
            {!!archivos.length && <ul className="region-files">{archivos.map(a => <li key={a.file.name}>
              <span className={`region-badge region-badge--${a.sensor.toLowerCase()}`}>{a.sensor}</span><span className="region-file-name">{a.file.name}</span><span>{mb(a.file.size)}</span>
              <button aria-label={`Quitar ${a.file.name}`} onClick={() => setArchivos(archivos.filter(x => x !== a))}>×</button></li>)}</ul>}
            <details className="region-help"><summary>¿Cómo consigo los archivos?</summary><ol>
              <li>Entra a <a href="https://firms.modaps.eosdis.nasa.gov/download/" target="_blank" rel="noreferrer">FIRMS · Archive Download</a> (pide una cuenta gratuita de NASA Earthdata).</li>
              <li>Pide <strong>MODIS C6.1</strong> y <strong>VIIRS S-NPP 375 m</strong>, en formato <strong>CSV</strong>, de 2013-01-01 a 2026-07-31.</li>
              <li>Como área, usa una caja con estas coordenadas (oeste, sur, este, norte): {forma ? <code className="region-code">{bboxTxt} <button className="region-link" onClick={() => void navigator.clipboard?.writeText(bboxTxt)}>Copiar</button></code> : 'elige primero la región'}.</li>
              <li>FIRMS te envía los archivos por correo; súbelos aquí tal cual (el .zip también sirve).</li></ol></details>
          </> : <div className="region-mapkey">
            <label className="region-field"><span>MAP_KEY de FIRMS <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer">(pídelo gratis)</a></span>
              <input type="password" autoComplete="off" value={mapKey} onChange={e => setMapKey(e.target.value.trim())} placeholder="32 caracteres" /></label>
            <div className="region-grid2">
              <label className="region-field"><span>Desde</span><input type="date" value={desde} min="2012-01-20" onChange={e => setDesde(e.target.value)} /></label>
              <label className="region-field"><span>Hasta</span><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label></div>
            <p className="region-note">Tu MAP_KEY solo se usa en este navegador para pedir los datos; no se guarda. Bajar 2013–2026 completo toma unos 20–30 minutos porque FIRMS limita los pedidos.</p>
          </div>}
        </section>

        <section className={`region-card${listo || estado.fase !== 'inicio' ? '' : ' is-locked'}`} aria-labelledby="paso3">
          <h2 id="paso3">{paso(3, estado.fase === 'listo')} Procesar</h2>
          {estado.fase !== 'procesando' && <button className="region-primary" disabled={!listo} onClick={procesar}>{estado.fase === 'listo' ? 'Procesar de nuevo' : 'Procesar en mi computadora'}</button>}
          {estado.fase === 'procesando' && <div className="region-progress" role="status" aria-live="polite">
            <div className="region-bar"><span style={{ width: `${Math.round(estado.fraccion * 100)}%` }} /></div>
            <p>{estado.etapa}… <strong>{Math.round(estado.fraccion * 100)}%</strong></p>
            <button className="region-link" onClick={() => { worker.current?.terminate(); setEstado({ fase: 'inicio' }) }}>Cancelar</button></div>}
          {estado.fase === 'error' && <div className="region-alert" role="alert"><strong>No se pudo procesar.</strong> {estado.mensaje}</div>}
          {estado.fase === 'listo' && <Resultado resumen={estado.resumen} onDescargar={() => descargar(estado.archivos, estado.resumen.region_id)} />}
        </section>
      </div>

      <aside className="region-aside">
        <section className="region-card region-card--soft">
          <h2>¿Ya tienes un resultado?</h2>
          <p>Sube el <code>.zip</code> que descargaste antes (o que te compartieron) y velo en el Calendario y el Mapa.</p>
          <label className="region-drop region-drop--small"><input type="file" accept=".zip" onChange={e => e.target.files?.[0] && void subirResultado(e.target.files[0])} /><span>Elegir resultado (.zip)</span></label>
          {aviso && <p className="region-note" role="status">{aviso}</p>}
        </section>
        {guardado && <section className="region-card region-card--saved">
          <h2>Guardado en este navegador</h2>
          <p><strong>{guardado.nombre}</strong><br /><small>{guardado.region_id} · {new Date(guardado.guardado).toLocaleString('es')}</small></p>
          <div className="region-actions">
            <Link className="region-secondary" to={enlace('/calendario', guardado.region_id)}>Calendario</Link>
            <Link className="region-secondary" to={enlace('/mapa', guardado.region_id)}>Mapa</Link>
          </div>
          <div className="region-actions">
            <button className="region-link" onClick={() => descargar(guardado.archivos, guardado.region_id)}>Descargar .zip</button>
            <button className="region-link" onClick={() => void borrarConjunto().then(() => setGuardado(null))}>Borrar</button>
          </div>
        </section>}
        <p className="region-fineprint">Resultados exploratorios: el factor κ se calcula automáticamente para tu región y no tiene la revisión del equipo que sí tienen Ucayali y Perú. Una detección térmica no es un incendio confirmado. Límites administrativos: geoBoundaries (CC BY 4.0).</p>
      </aside>
    </div>
  </div>
}

function Resultado({ resumen, onDescargar }: { resumen: Resumen; onDescargar: () => void }) {
  return <div className="region-result">
    <div className="region-result-head"><span className="region-result-ok" aria-hidden="true">✓</span><div><h3>{resumen.nombre}</h3><p>{resumen.periodo.desde} a {resumen.periodo.hasta} · zona {resumen.zona_horaria}</p></div></div>
    <div className="region-stats">
      <div><span>Calibración B1</span><strong>{resumen.b1_disponible ? 'Disponible' : 'No disponible'}</strong></div>
      <div><span>Factor κ local</span><strong>{resumen.kappa === null ? '—' : resumen.kappa.toFixed(3)}</strong></div>
      <div><span>Mapa</span><strong>{resumen.celda_mapa_km} km</strong></div>
    </div>
    {!!resumen.advertencias.length && <ul className="region-warnings">{resumen.advertencias.map(a => <li key={a}>{a}</li>)}</ul>}
    <div className="region-actions">
      <Link className="region-primary" to={enlace('/calendario', resumen.region_id)}>Ver calendario</Link>
      <Link className="region-secondary" to={enlace('/mapa', resumen.region_id)}>Ver mapa</Link>
      <button className="region-secondary" onClick={onDescargar}>Descargar resultado (.zip)</button>
    </div>
  </div>
}
