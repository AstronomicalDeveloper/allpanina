import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes.tsx'
import { titleFor } from '../src/app/useDocumentTitle.ts'
import { readFile } from 'node:fs/promises'
import { parseMonthlySeries } from '../src/services/data/validators.ts'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})

const files: Record<string,string> = {}
for (const name of ['monthly_series.csv','calibrated_series.csv','manifest.json','method.json']) files[`/data/peru/${name}`] = await readFile(new URL(`../public/data/peru/${name}`, import.meta.url), 'utf8')
const monthly = parseMonthlySeries(files['/data/peru/monthly_series.csv'])
const value = (region: string, year: number, month: number) => monthly.find(r => r.region_id === region && r.sensor_group === 'MODIS' && r.year === year && r.month === month)!.cell_days!

async function open(t: import('node:test').TestContext, url: string) {
  t.mock.method(globalThis, 'fetch', async (input: string) => new Response(files[input] ?? '', { status: files[input] === undefined ? 404 : 200 }))
  window.history.replaceState(null,'',url)
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
  t.after(async()=>{await act(async()=>root.unmount());host.remove()})
  await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
  return host
}

test('la raíz muestra la página de inicio y enlaza a las tres vistas con el ámbito elegido',async t=>{
  const host=await open(t,'/')
  assert.equal(window.location.pathname,'/')
  assert.equal(host.querySelectorAll('h1').length,1)
  assert.match(host.querySelector('h1')!.textContent!,/thermal detections/i)
  const urls=[...host.querySelectorAll<HTMLAnchorElement>('main a')].map(a=>new URL(a.href))
  for(const ruta of ['/calendar','/map','/method'])assert.ok(urls.some(url=>url.pathname===ruta),`falta enlace a ${ruta}`)
  assert.ok(urls.some(url=>url.pathname==='/map'&&url.searchParams.get('mapRegion')==='PE'))
  assert.equal(host.querySelector('nav [aria-current="page"]')?.textContent,'Home')
})

test('el calendario de la portada usa la serie publicada del Perú: 14 años × 12 meses y cifras del CSV',async t=>{
  const host=await open(t,'/')
  const hero=host.querySelector('[aria-labelledby="hero-calendar-caption"]')!
  assert.equal(hero.querySelectorAll('ol > li').length,14)
  assert.equal(hero.querySelectorAll('ol a').length,14*12)
  const august=hero.querySelector<HTMLAnchorElement>('a[aria-label^="August 2024:"]')!
  assert.equal(august.getAttribute('aria-label'),`August 2024: ${value('PE',2024,8).toLocaleString('en-US')} cell-days. Open in the calendar`)
  assert.ok(hero.querySelector('a[aria-label^="August 2026: not published"]'))
  assert.match(hero.textContent!,/Months with the most detections/)
  assert.match(host.querySelector('#hero-calendar-caption')!.textContent!,/Peru · MODIS · cell-days with detections per month, Jan 2013 to Jul 2026/)
  await act(async()=>august.dispatchEvent(new dom.window.MouseEvent('mouseover',{bubbles:true})))
  assert.match(hero.textContent!,new RegExp(`Aug 2024 · ${value('PE',2024,8).toLocaleString('en-US')} cell-days`))
})

test('elegir un departamento cambia el calendario y el clic en una celda abre ese mes en el Calendario',async t=>{
  const host=await open(t,'/')
  const select=host.querySelector<HTMLSelectElement>('#landing-region')!
  assert.equal(select.options.length,26)
  await act(async()=>{select.value='PE-08';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
  const cell=host.querySelector<HTMLAnchorElement>('[aria-labelledby="hero-calendar-caption"] a[aria-label^="September 2024:"]')!
  assert.match(cell.getAttribute('aria-label')!,new RegExp(`^September 2024: ${value('PE-08',2024,9).toLocaleString('en-US')} cell-days`))
  const see=[...host.querySelectorAll<HTMLAnchorElement>('main a')].find(a=>a.textContent==='See its calendar')!
  assert.equal(new URL(see.href).searchParams.get('mapRegion'),'PE-08')
  await act(async()=>cell.click())
  assert.equal(window.location.pathname,'/calendar')
  const params=new URLSearchParams(window.location.search)
  assert.deepEqual([params.get('mapRegion'),params.get('periodYear'),params.get('periodMonth'),params.get('calendarSeries')],['PE-08','2024','9','MODIS'])
  assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'September 2024')
  assert.equal(host.querySelector('.calendar-observed-value')!.textContent,value('PE-08',2024,9).toLocaleString('en-US'))
})

test('la página de inicio explica cómo leer los datos y sus límites, sin prometer lo que no demuestra',async t=>{
  const host=await open(t,'/')
  const text=host.querySelector('main')!.textContent!.toLowerCase()
  for(const frase of ['25 departments','10 km blocks','not a confirmed fire','does not predict','real-time','cell-day','nasa firms','inei','how to read the results','not the error of a single month'])assert.ok(text.includes(frase),`falta: ${frase}`)
  for(const prohibida of ['predicts future fires','live alerts','confirmed fire detection','fires per month','número de incendios'])assert.ok(!text.includes(prohibida),`no debe decir: ${prohibida}`)
})

test('si la serie no carga, la portada lo dice y permite reintentar sin inventar valores',async t=>{
  let fail=true
  t.mock.method(globalThis,'fetch',async(input:string)=>new Response(fail?'':files[input],{status:fail?503:200}))
  window.history.replaceState(null,'','/')
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
  t.after(async()=>{await act(async()=>root.unmount());host.remove()})
  await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
  assert.match(host.querySelector('[role="alert"]')!.textContent!,/could not be loaded/)
  assert.equal(host.querySelector('[aria-labelledby="hero-calendar-caption"]'),null)
  fail=false
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Retry')!.click())
  assert.equal(host.querySelectorAll('[aria-labelledby="hero-calendar-caption"] ol a').length,14*12)
})

test('la marca de la barra lleva al inicio',async t=>{
  const host=await open(t,'/calendar')
  const brand=host.querySelector<HTMLAnchorElement>('header a[aria-label="AllpaNina, go to home"]')!
  assert.ok(brand)
  assert.equal(new URL(brand.href).pathname,'/')
})

test('un enlace antiguo con parámetros en la raíz sigue llegando al Calendario',async t=>{
  const host=await open(t,'/?sensor=VIIRS&periodYear=2024#detalle')
  assert.equal(window.location.pathname,'/calendar')
  assert.equal(window.location.search,'?sensor=VIIRS&periodYear=2024')
  assert.equal(window.location.hash,'#detalle')
  assert.match(host.querySelector('h1')!.textContent!,/Thermal detection calendar/)
})

test('cada ruta tiene su propio título de pestaña',async t=>{
  for(const [ruta,esperado] of [['/',/Satellite thermal detections/],['/calendar',/^Calendar · AllpaNina/],['/map',/^Map · AllpaNina/],['/method',/^Method · AllpaNina/],['/my-region',/^My region · AllpaNina/],['/about',/^About · AllpaNina/],['/calendario',/^Calendar · AllpaNina/],['/no-such-page',/^Page not found/]] as const){
    await open(t,ruta)
    assert.match(document.title,esperado,ruta)
  }
  assert.equal(titleFor('/calendar/'),titleFor('/calendar'))
})
