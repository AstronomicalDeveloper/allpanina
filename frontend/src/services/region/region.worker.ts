/** Web Worker de Mi región: lee archivos, descarga FIRMS si se pide y corre el algoritmo sin congelar la página. */
import { descargarFirms } from './descarga.ts'
import { detectarSensor } from './firms.ts'
import { procesarRegion } from './pipeline.ts'
import type { ArchivoEntrada, Opciones } from './pipeline.ts'
import { leerZip } from './zip.ts'

export type Pedido = {
  archivos?: File[]
  descarga?: { mapKey: string; desde: string; hasta: string; base?: string }
  opciones: Omit<Opciones, 'progreso'>
}
export type Respuesta =
  | { tipo: 'progreso'; etapa: string; fraccion: number }
  | { tipo: 'listo'; archivos: Record<string, string>; resumen: Awaited<ReturnType<typeof procesarRegion>>['resumen'] }
  | { tipo: 'error'; mensaje: string }

const enviar = (r: Respuesta) => (self as unknown as Worker).postMessage(r)
const dec = new TextDecoder()

async function entradas(archivos: File[]) {
  const out: ArchivoEntrada[] = [], ignorados: string[] = []
  for (const file of archivos) {
    if (/\.zip$/i.test(file.name)) {
      const dentro = await leerZip(await file.arrayBuffer())
      for (const [ruta, bytes] of Object.entries(dentro)) {
        const nombre = ruta.split('/').pop()!
        if (!/\.csv$/i.test(nombre)) continue
        if (/^fire_nrt/i.test(nombre)) { ignorados.push(nombre); continue }
        out.push({ nombre, texto: dec.decode(bytes), bytes: bytes.buffer as ArrayBuffer })
      }
    } else {
      const bytes = await file.arrayBuffer()
      out.push({ nombre: file.name, texto: dec.decode(bytes), bytes })
    }
  }
  return { out, ignorados }
}

self.onmessage = async (ev: MessageEvent<Pedido>) => {
  const { archivos = [], descarga, opciones } = ev.data
  try {
    const progreso = (etapa: string, fraccion: number) => enviar({ tipo: 'progreso', etapa, fraccion })
    let lista: ArchivoEntrada[]
    let ignorados: string[] = []
    if (descarga) {
      const bbox = opciones.bbox!
      const r = await descargarFirms({ ...descarga, bbox, progreso: (s, i, n, filas) => progreso(`Descargando ${s} de FIRMS · ${filas.toLocaleString('es')} detecciones`, (s === 'MODIS' ? 0 : 0.5) + 0.5 * i / n) })
      lista = [{ nombre: `firms_MODIS_SP_${descarga.desde}_${descarga.hasta}.csv`, texto: r.MODIS }, { nombre: `firms_VIIRS_SNPP_SP_${descarga.desde}_${descarga.hasta}.csv`, texto: r.VIIRS }]
    } else ({ out: lista, ignorados } = await entradas(archivos))
    const modis: ArchivoEntrada[] = [], viirs: ArchivoEntrada[] = []
    for (const a of lista) (detectarSensor(a.texto, a.nombre) === 'MODIS' ? modis : viirs).push(a)
    if (!modis.length) throw new Error('Falta el archivo de MODIS (fire_archive_M-C61_*.csv).')
    if (!viirs.length) throw new Error('Falta el archivo de VIIRS S-NPP (fire_archive_SV-C2_*.csv).')
    const res = await procesarRegion(modis, viirs, { ...opciones, progreso })
    if (ignorados.length) res.resumen.advertencias.unshift(`Se ignoraron archivos NRT (casi tiempo real): ${ignorados.join(', ')}. Solo se usa el archivo estándar.`)
    enviar({ tipo: 'listo', ...res })
  } catch (e) {
    enviar({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) })
  }
}
