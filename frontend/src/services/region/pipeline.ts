/**
 * Modo exploratorio en el navegador. Reutiliza reglas de scripts 02–06 y contrasta
 * el caso Ucayali con los productos publicados; no reemplaza los κ de Perú.
 */
import { cellBounds, cellOf } from './ea6933.ts'
import { ErrorDeEntrada, detectarSensor, leerFirms } from './firms.ts'
import type { Entrada, Sensor } from './firms.ts'
import { LocalDay, dayToYmd } from './localDay.ts'
import { RegionShape } from './polygon.ts'
import { f, pyFloat, pyJson, round5 } from './pyformat.ts'

export { ErrorDeEntrada }
export const VERSION = '1.1-web'
const TRAIN_FIN = '2022-12', VALID_FIN = '2024-12', TEST_FIN = '2026-07'
const INICIO = 2013 * 12                       // 2013-01 como índice de mes
const VENTANA: Record<Sensor, number> = { MODIS: 2003 * 12, VIIRS: 2012 * 12 + 1 }
export const UMBRAL_VIIRS = 5000, UMBRAL_MODIS = 1000, MIN_MODIS_REPORTE = 50
export const AREA_1KM_MAX = 150_000
const PRODUCTO = 'MCD14ML v6.1 / VNP14IMGML v2'
const SENSORES: Sensor[] = ['MODIS', 'VIIRS']

export interface ArchivoEntrada { nombre: string; texto: string; bytes?: ArrayBuffer }
export interface Opciones {
  region_id: string; nombre?: string; zona_horaria: string
  poligono?: unknown; bbox?: [number, number, number, number]
  celda_mapa_km?: number; desde?: string; hasta?: string; actualizado?: string; generado?: string
  umbral_viirs?: number; umbral_modis?: number
  progreso?: (etapa: string, fraccion: number) => void
}
export interface Resultado {
  archivos: Record<string, string>
  resumen: { region_id: string; nombre: string; periodo: { desde: string; hasta: string }; kappa: number | null; b1_disponible: boolean; celda_mapa_km: number; zona_horaria: string; advertencias: string[]; area_km2: number }
}

const mesTxt = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
const split = (mes: string) => (mes <= TRAIN_FIN ? 'train' : mes <= VALID_FIN ? 'valid' : mes <= TEST_FIN ? 'test' : 'sin_validar')
const valido = (x: number | null): x is number => x !== null && !Number.isNaN(x)
const mesIdx = (s: string) => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1 }
const fmtMiles = (v: number) => Math.round(v).toLocaleString('en-US')

async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  const h = await crypto.subtle.digest('SHA-256', buf as BufferSource)
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Zona aproximada por longitud (hora solar), como zona_por_longitud de Python. */
export function zonaPorLongitud(lon: number): string {
  const h = Math.round(lon / 15)
  return h === 0 ? 'UTC' : `Etc/GMT${h < 0 ? '+' : '-'}${Math.abs(h)}`
}

interface Fila { year: number; month: number; modis: number | null; viirs: number | null; split: string }
interface Calibrada { region_id: string; year: number; month: number; method: 'B0' | 'B1'; value: number | null; split: string; status: string; residual: number | null }

function metricas(modis: (number | null)[], est: (number | null)[]) {
  const pares = modis.map((m, i) => [m, est[i]] as const).filter(([m, e]) => valido(m) && valido(e)) as [number, number][]
  const n = pares.length
  if (!n) return { n_months_matched: 0, mae: null, wape: null, bias: null }
  const err = pares.map(([m, e]) => e - m), sm = pares.reduce((a, [m]) => a + m, 0), abs = err.reduce((a, x) => a + Math.abs(x), 0)
  return { n_months_matched: n, mae: abs / n, wape: sm !== 0 ? abs / sm : null, bias: err.reduce((a, x) => a + x, 0) / n }
}

function validacion(cal: Calibrada[], modisMes: Map<string, number | null>, region_id: string, sp: string) {
  const methods: Record<string, unknown> = {}
  for (const method of ['B0', 'B1'] as const) {
    const rows = cal.filter(r => r.method === method && r.split === sp)
    const meses = rows.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`)
    const est = rows.map(r => r.value), modis = meses.map(m => modisMes.get(m) ?? null)
    const m = metricas(modis, est)
    const bloque: Record<string, unknown> = { split: sp, metrics: { mae: f(m.mae), wape: f(m.wape), bias: f(m.bias) }, n_months_matched: m.n_months_matched }
    if (sp === 'test') {
      const res = meses.map((mes, i) => ({ mes, m: modis[i], e: est[i] })).filter(x => valido(x.m) && valido(x.e))
        .map(x => ({ month: x.mes, modis_observed: f(x.m), estimate: f(x.e), signed_error: f(x.e! - x.m!), absolute_error: f(Math.abs(x.e! - x.m!)), _abs: Math.abs(x.e! - x.m!) }))
        .sort((a, b) => b._abs - a._abs).map(({ _abs, ...r }) => { void _abs; return r })
      if (res.length) bloque.residuals = res
      else bloque.detalle_mensual = 'no disponible'
    }
    methods[method] = bloque
  }
  return { region_id, methods }
}

export async function procesarRegion(modis: ArchivoEntrada[], viirs: ArchivoEntrada[], op: Opciones): Promise<Resultado> {
  const avisar = op.progreso ?? (() => {})
  const region_id = op.region_id
  if (!/^[\w.-]+$/.test(region_id) || region_id.length > 40) throw new ErrorDeEntrada("The region code must use ASCII letters, digits, hyphens, dots or underscores, with no spaces or slashes (e.g. 'AR-M').")
  if (!modis.length || !viirs.length) throw new ErrorDeEntrada('Files from both sensors are needed: MODIS and VIIRS.')
  const forma = op.poligono !== undefined ? RegionShape.fromGeoJson(op.poligono) : op.bbox ? RegionShape.fromBbox(op.bbox) : null
  if (!forma) throw new ErrorDeEntrada('The region is needed: a GeoJSON polygon or a box (west, south, east, north).')
  if (!LocalDay.valid(op.zona_horaria)) throw new ErrorDeEntrada(`Unknown time zone: ${op.zona_horaria} (use an IANA name).`)
  const advertencias: string[] = []
  const km = op.celda_mapa_km ?? (forma.area_km2 <= AREA_1KM_MAX ? 1 : 10)
  if (!Number.isInteger(km) || km < 1) throw new ErrorDeEntrada('The map cell must be a positive whole number of kilometres.')
  for (const mes of [op.desde, op.hasta]) if (mes !== undefined && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErrorDeEntrada('The period must use valid YYYY-MM months.')
  const actualizado = op.actualizado ?? new Date().toISOString().slice(0, 10)
  const uv = op.umbral_viirs ?? UMBRAL_VIIRS, um = op.umbral_modis ?? UMBRAL_MODIS
  const dia = new LocalDay(op.zona_horaria)

  // 1-3. Lectura, filtros, día local y celda-días de 1 km (una por celda, día y sensor).
  const celdaDias = new Map<string, string | null>()      // "S|x|y|día" -> versión mínima
  const entradas: Entrada[] = []
  const todos = [...modis.map(a => [a, 'MODIS'] as const), ...viirs.map(a => [a, 'VIIRS'] as const)]
  for (const [k, [archivo, sensor]] of todos.entries()) {
    avisar(`Reading ${archivo.nombre}`, k / todos.length)
    const detectado = detectarSensor(archivo.texto, archivo.nombre)
    if (detectado !== sensor) throw new ErrorDeEntrada(`${archivo.nombre}: it is a ${detectado} file, but it was loaded as ${sensor}.`)
    const info = leerFirms(archivo.texto, archivo.nombre, sensor, fila => {
      const [x, y] = cellOf(fila.lon, fila.lat)
      const key = `${sensor === 'MODIS' ? 'M' : 'V'}|${x}|${y}|${dia.day(fila.utcMs)}`
      const prev = celdaDias.get(key)
      if (prev === undefined) celdaDias.set(key, fila.version)
      else if (fila.version !== null && (prev === null || fila.version < prev)) celdaDias.set(key, fila.version)
    })
    entradas.push({ ...info, sha256: await sha256(archivo.bytes ?? archivo.texto) })
  }

  avisar('Building the monthly series', 0.55)
  // 4. Cobertura (toda el área descargada), versiones y conteo dentro de la región.
  const cubiertos = new Set<string>(), versiones = new Map<string, Set<string>>(), conteo = new Map<string, number>()
  const rango: Record<Sensor, [number, number]> = { MODIS: [Infinity, -Infinity], VIIRS: [Infinity, -Infinity] }
  const dentro = new Map<string, boolean>(), enRegion: [Sensor, number, number, number, number][] = []   // sensor, x, y, año, mes
  for (const [key, ver] of celdaDias) {
    const [s, xs, ys, ds] = key.split('|')
    const sensor: Sensor = s === 'M' ? 'MODIS' : 'VIIRS'
    const [year, month] = dayToYmd(Number(ds))
    const idx = year * 12 + month - 1, mk = `${sensor}|${idx}`
    cubiertos.add(mk)
    rango[sensor][0] = Math.min(rango[sensor][0], idx); rango[sensor][1] = Math.max(rango[sensor][1], idx)
    if (ver !== null) { let set = versiones.get(mk); if (!set) versiones.set(mk, set = new Set()); set.add(ver) }
    const ck = `${xs}|${ys}`
    let ok = dentro.get(ck)
    if (ok === undefined) {
      const [w, so, e, n] = cellBounds(Number(xs), Number(ys))
      ok = forma.contains(round5((w + e) / 2), round5((so + n) / 2))
      dentro.set(ck, ok)
    }
    if (ok) { conteo.set(mk, (conteo.get(mk) ?? 0) + 1); enRegion.push([sensor, Number(xs), Number(ys), year, month]) }
  }
  for (const s of SENSORES) if (!Number.isFinite(rango[s][0])) throw new ErrorDeEntrada(`After the quality filters there is no ${s} detection left.`)
  let ini = Math.max(rango.MODIS[0], rango.VIIRS[0], INICIO), fin = Math.min(rango.MODIS[1], rango.VIIRS[1])
  if (op.desde) ini = Math.max(ini, mesIdx(op.desde))
  if (op.hasta) fin = Math.min(fin, mesIdx(op.hasta))
  if (ini > fin) throw new ErrorDeEntrada('The data have no months shared by MODIS and VIIRS since 2013-01.')

  const serieCsv = ['region_id,year,month,sensor_group,cell_days,status,source_version,updated_at']
  const filas: Fila[] = []
  let algoDentro = false
  for (let i = ini; i <= fin; i++) {
    const year = Math.floor(i / 12), month = (i % 12) + 1
    const fila: Fila = { year, month, modis: null, viirs: null, split: split(mesTxt(i)) }
    for (const s of SENSORES) {
      const mk = `${s}|${i}`
      if (i >= VENTANA[s] && cubiertos.has(mk)) {
        const v = conteo.get(mk) ?? 0
        if (v > 0) algoDentro = true
        serieCsv.push(`${region_id},${year},${month},${s},${v},ok,${[...(versiones.get(mk) ?? [])].sort().join('+')},${actualizado}`)
        fila[s === 'MODIS' ? 'modis' : 'viirs'] = v
      } else serieCsv.push(`${region_id},${year},${month},${s},,missing,,${actualizado}`)
    }
    filas.push(fila)
  }
  if (!algoDentro) advertencias.push('Ninguna detección cae dentro de la región: revise el polígono y el área descargada.')

  // 5. κ local solo con train y meses con los dos sensores; B0/B1.
  avisar('Calibrating', 0.7)
  const pares = filas.filter(r => r.split === 'train' && valido(r.modis) && valido(r.viirs))
  const sm = pares.reduce((a, r) => a + r.modis!, 0), sv = pares.reduce((a, r) => a + r.viirs!, 0)
  const insumos = { suma_modis_train: f(sm), suma_viirs_train: f(sv), meses_train: pares.length }
  let kappa: number | null = null, motivo: string | null = null
  if (sv < uv || sm < um) motivo = `pocos datos en train 2013-2022 (Σ VIIRS ${fmtMiles(sv)}, Σ MODIS ${fmtMiles(sm)}; mínimo ${fmtMiles(uv)} y ${fmtMiles(um)})`
  else kappa = sv === 0 ? null : sm / sv
  if (motivo) advertencias.push(`No se ofrece B1: ${motivo}. Se muestran solo los datos observados.`)
  const anual: number[] = []
  for (const y of [...new Set(filas.filter(r => r.split === 'train').map(r => r.year))].sort((a, b) => a - b)) {
    const p = filas.filter(r => r.year === y && valido(r.modis) && valido(r.viirs)), v = p.reduce((a, r) => a + r.viirs!, 0)
    if (v > 0) anual.push(p.reduce((a, r) => a + r.modis!, 0) / v)
  }
  const cal: Calibrada[] = []
  for (const r of filas) for (const method of ['B0', 'B1'] as const) {
    const ok = valido(r.viirs) && !(method === 'B1' && kappa === null)
    const value = ok ? (method === 'B0' ? r.viirs! : r.viirs! * kappa!) : null
    const residual = r.split === 'test' && value !== null && valido(r.modis) ? value - r.modis : null
    cal.push({ region_id, year: r.year, month: r.month, method, value, split: r.split, status: ok ? 'ok' : 'missing', residual })
  }
  const calCsv = ['region_id,year,month,method,value,split,status,residual', ...cal.map(r =>
    [r.region_id, r.year, r.month, r.method, r.value === null ? '' : pyFloat(r.value), r.split, r.status, r.residual === null ? '' : pyFloat(r.residual)].join(','))]

  const modisMes = new Map(filas.map(r => [`${r.year}-${String(r.month).padStart(2, '0')}`, r.modis]))
  const resultados: Record<string, unknown> = {}
  let validationTest: Record<string, unknown> = {}, reportableTest = false
  for (const [sp, periodo] of [['valid', '2023-01:2024-12'], ['test', '2025-01:2026-07']]) {
    const bloque = validacion(cal, modisMes, region_id, sp)
    const suma = filas.filter(r => r.split === sp && valido(r.modis)).reduce((a, r) => a + r.modis!, 0)
    const n = filas.filter(r => r.split === sp).length
    const reportable = kappa !== null && n > 0 && suma >= MIN_MODIS_REPORTE
    const m = bloque.methods as Record<string, { metrics: unknown }>
    if (n) resultados[sp] = { periodo, n_meses: n, suma_modis: f(suma), reportable, ...(reportable ? { B0: m.B0.metrics, B1: m.B1.metrics } : { motivo: motivo ?? `Σ MODIS ${fmtMiles(suma)} < ${MIN_MODIS_REPORTE}` }) }
    if (sp === 'test') { validationTest = bloque; reportableTest = reportable }
  }

  // 6. Mapas: solo observados, por año, celdas de 1 km o bloques de km × km.
  avisar('Drawing the maps', 0.8)
  const archivos: Record<string, string> = {
    'monthly_series.csv': serieCsv.join('\n') + '\n',
    'calibrated_series.csv': calCsv.join('\n') + '\n',
    'validation.json': pyJson({ ...validationTest, evaluacion: 'automática fuera de muestra (modo región, exploratorio)', reportable: reportableTest }) + '\n',
  }
  const ultimoAno = Math.floor(fin / 12)
  const mapas: string[] = []
  for (let year = Math.floor(ini / 12); year <= ultimoAno; year++) {
    const grupos = new Map<string, number>()
    for (const [s, x, y, yr, mo] of enRegion) {
      if (yr !== year || yr * 12 + mo - 1 < ini || yr * 12 + mo - 1 > fin) continue
      const bx = Math.floor(x / km) * km, by = Math.floor(y / km) * km
      const k = `${mo}|${s}|${bx}|${by}`
      grupos.set(k, (grupos.get(k) ?? 0) + 1)
    }
    const filasMapa = [...grupos].map(([k, n]) => { const [mo, s, x, y] = k.split('|'); return { mo: +mo, s, x: +x, y: +y, n } })
      .sort((a, b) => a.mo - b.mo || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0) || a.x - b.x || a.y - b.y)
    const feats = filasMapa.map(r => {
      const [w0, s0, e0, n0] = cellBounds(r.x, r.y, km)
      const [w, s, e, n] = [w0, s0, e0, n0].map(v => pyFloat(round5(v)))
      return `{"type":"Feature","properties":{"cell_id":"${r.x}_${r.y}","year":${year},"month":${r.mo},"sensor_group":"${r.s}","cell_days":${r.n}},"geometry":{"type":"Polygon","coordinates":[[[${w},${s}],[${e},${s}],[${e},${n}],[${w},${n}],[${w},${s}]]]}}`
    })
    const nombre = `cells_${region_id}_${year}.geojson`
    archivos[nombre] = `{"type":"FeatureCollection","features":[${feats.join(',')}]}\n`
    mapas.push(nombre)
    avisar('Drawing the maps', 0.8 + 0.15 * (year - Math.floor(ini / 12) + 1) / (ultimoAno - Math.floor(ini / 12) + 1))
  }
  const grandes = mapas.filter(n => archivos[n].length > 8e6)
  if (grandes.length) advertencias.push(`Mapas de más de 8 MB (${grandes.join(', ')}): conviene una celda más grande.`)

  const periodo = { desde: mesTxt(ini), hasta: mesTxt(fin) }
  const nombre = op.nombre || region_id
  archivos['method.json'] = pyJson({
    contract_version: '1.0-region',
    estado: 'exploratorio: κ local calculado automáticamente con train 2013-2022 y evaluado fuera de muestra; sin la revisión científica ni el test con firmas del piloto (Ucayali) ni de la extensión Perú',
    region_id, region: nombre,
    indicator: 'cell_days: pares (celda de 1 km, día local) con al menos una detección de fuego activo, por mes y sensor.',
    sensors: ['MODIS Terra', 'MODIS Aqua', 'VIIRS S-NPP'],
    products: 'Producto estándar de NASA FIRMS (MODIS C6.1 y VIIRS S-NPP 375 m C2)',
    filters: 'type = 0; MODIS confianza ≥ 30; VIIRS confianza nominal o alta; duplicados exactos fuera.',
    zona_horaria: op.zona_horaria, celda_mapa_km: km, area_km2: f(Math.round(forma.area_km2 * 10) / 10),
    period_train: '2013-01:2022-12', period_valid: '2023-01:2024-12', period_test: '2025-01:2026-07',
    error_convention: 'signed_error = estimate - modis_observed; bias = media; MAE = media de |error|; WAPE = Σ|error| / Σ MODIS.',
    status_rule: 'ok = sensor operando; missing = fuera de la ventana del sensor o mes sin ninguna detección en toda el área descargada.',
    calibration: `B0 = VIIRS sin factor. B1 = B0 × κ local, con κ = Σ MODIS / Σ VIIRS en train 2013-2022 (meses con los dos sensores). Se ofrece solo si Σ VIIRS ≥ ${fmtMiles(uv)} y Σ MODIS ≥ ${fmtMiles(um)} en train.`,
    kappa: f(kappa), kappa_inputs: insumos, kappa_anual_rango: anual.length ? [f(Math.min(...anual)), f(Math.max(...anual))] : null,
    resultados,
    limitations: [
      'Resultado exploratorio: el κ y la evaluación son automáticos, sin revisión científica del equipo.',
      'El κ cambia de una región a otra y de un año a otro; un κ fijo no sigue la intensidad de cada temporada (en el piloto y en Perú subestimó picos de años extremos y sobreestimó años de poca actividad).',
      'B1 se valida a escala región-mes. No debe aplicarse a celdas individuales del mapa; el mapa muestra solo observados.',
      'El indicador cuenta detecciones satelitales de anomalías térmicas, no incendios confirmados ni superficie quemada.',
      'FIRMS no entrega cobertura de nubes: un mes con 0 detecciones puede ser ausencia de fuego o falta de observación.',
      'Suomi NPP dejó de producir datos nuevos el 2-nov-2026 y NASA prevé terminar MODIS en 2027.',
      'Un error retrospectivo de B1 no es un porcentaje de confianza para meses futuros.',
      ...(motivo ? [`La región no tiene datos suficientes para B1: ${motivo}.`] : []),
    ],
  }) + '\n'
  const generado = op.generado ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  archivos['procedencia.json'] = pyJson({
    algoritmo: 'allpanina web (procesarRegion)', version: VERSION, generado, entradas,
    region: { region_id, nombre: op.nombre ?? null, bbox: forma.bbox, area_km2: f(Math.round(forma.area_km2 * 10) / 10), poligono_sha256: op.poligono !== undefined ? await sha256(JSON.stringify(op.poligono)) : null },
    zona_horaria: op.zona_horaria, celda_mapa_km: km, periodo,
    kappa: { valor: f(kappa), recalibrado_automaticamente: true, revisado_por_el_equipo: false },
    advertencias,
  }) + '\n'
  const files = ['monthly_series.csv', 'calibrated_series.csv', 'validation.json', 'method.json', ...mapas.sort(), 'procedencia.json']
  const hash: Record<string, string> = {}
  for (const n of files) hash[n] = 'sha256:' + await sha256(archivos[n])
  archivos['manifest.json'] = pyJson({ generated_at: generado, region_id, producto: PRODUCTO, files, hash, sources: entradas, periodo, contract_version: '1.0-region' }) + '\n'
  avisar('Done', 1)
  return { archivos, resumen: { region_id, nombre, periodo, kappa, b1_disponible: kappa !== null, celda_mapa_km: km, zona_horaria: op.zona_horaria, advertencias, area_km2: forma.area_km2 } }
}
