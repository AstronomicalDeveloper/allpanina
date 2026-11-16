import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Pedido, Respuesta } from '../src/services/region/region.worker'
import { parseMonthlySeries } from '../src/services/data/validators'

test('protocolo Worker con File y ZIP reales: progreso, salida y error', async t => {
  const mensajes: Respuesta[] = []
  const scope = { postMessage: (r: Respuesta) => mensajes.push(r), onmessage: null as ((e: { data: Pedido }) => Promise<void>) | null }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'self')
  Object.defineProperty(globalThis, 'self', { value: scope, configurable: true })
  t.after(() => { if (original) Object.defineProperty(globalThis, 'self', original); else Reflect.deleteProperty(globalThis, 'self') })
  await import('../src/services/region/region.worker')
  const { escribirZip } = await import('../src/services/region/zip')
  const cab = 'latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,version,type\n'
  const m = cab + '-32.9,-68.8,2020-09-10,1500,Aqua,MODIS,80,61.03,0\n'
  const v = cab + '-32.9,-68.8,2020-09-10,1500,N,VIIRS,n,2,0\n'
  const opciones = { region_id: 'AR-M', zona_horaria: 'UTC', bbox: [-70, -34, -68, -32] as [number, number, number, number] }
  await scope.onmessage!({ data: { archivos: [new File([await escribirZip({ 'fire_archive_m.csv': m, 'fire_archive_v.csv': v }).arrayBuffer()], 'firms.zip')], opciones } })
  assert.ok(mensajes.some(r => r.tipo === 'progreso'))
  const listo = mensajes.find(r => r.tipo === 'listo')
  assert.ok(listo && listo.tipo === 'listo')
  assert.equal(parseMonthlySeries(listo.archivos['monthly_series.csv']).length, 2)
  mensajes.length = 0
  await scope.onmessage!({ data: { archivos: [], opciones } })
  assert.ok(mensajes.some(r => r.tipo === 'error' && /MODIS/.test(r.mensaje)))
})
