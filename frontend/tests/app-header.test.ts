import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { act, createElement } from 'react'
import Navbar from '../src/components/layout/Navbar'
import { dom, files, mockFiles, mount, navigate } from './uiHarness'

test('v2 contexto publicado muestra región, fechas y productos reales junto al calendario',async t=>{
 mockFiles(t);const {host}=await mount(t)
 assert.match(host.querySelector('.calendar-heading')!.textContent!,/Ucayali, Perú/)
 assert.match(host.querySelector('.calendar-publication')!.textContent!,/2013-01.*2026-07.*MCD14ML/)
})
test('v2 metadatos fallidos no inventan descripción ni fallback y permiten reintentar',async t=>{
 let fail=true;t.mock.method(globalThis,'fetch',async(url:string)=>new Response(fail&&url.endsWith('method.json')?'{}':files[url]))
 const {host}=await mount(t)
 assert.match(host.querySelector('.calendar-heading')!.textContent!,/PE-UCA/)
 assert.doesNotMatch(host.querySelector('.calendar-heading')!.textContent!,/Ucayali, Perú/)
 assert.match(host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/Descripción de región no disponible/)
 fail=false;await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Reintentar archivos')!.click())
 assert.match(host.querySelector('.calendar-heading')!.textContent!,/Ucayali, Perú/)
})
test('v2 no combina el nombre de otra región con el manifiesto actual',async t=>{
 const method=JSON.parse(files['/data/method.json']);method.region_id='OTRA';method.region='Otra región'
 mockFiles(t,{'/data/method.json':JSON.stringify(method)});const {host}=await mount(t)
 assert.match(host.querySelector('.calendar-heading')!.textContent!,/PE-UCA/)
 assert.doesNotMatch(host.querySelector('.calendar-heading')!.textContent!,/Otra región/)
})
test('v2 navegación conserva URL, hash, enlaces reales y estado activo sin roles de pestañas',async t=>{
 const {host}=await mount(t,'/calendario?scope=month&periodYear=2024#detalle',createElement(Navbar))
 for(const link of host.querySelectorAll<HTMLAnchorElement>('nav a')) { assert.ok(link.href.includes('periodYear=2024')); assert.equal(new URL(link.href).hash,'#detalle') }
 assert.equal(host.querySelector('[role="tab"]'),null)
 await act(async()=>[...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a=>a.textContent==='Método')!.click())
 assert.equal(window.location.pathname,'/metodo');assert.equal(host.querySelector('[aria-current="page"]')!.textContent,'Método')
 await navigate('/mapa?periodYear=2024');assert.ok(host.querySelector('.navbar--map'))
 await navigate('/calendario');assert.equal(host.querySelector('.navbar--map'),null)
})
test('v2 menú de información muestra fuentes, cierra con Escape y devuelve foco',async t=>{
 const {host}=await mount(t,'/calendario',createElement(Navbar));const details=host.querySelector('details')!,summary=details.querySelector('summary')!
 await act(async()=>summary.click());assert.ok(details.open)
 assert.ok(details.querySelector('a[href="/data/manifest.json"]'))
 await act(async()=>details.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 assert.equal(details.open,false);assert.equal(document.activeElement,summary)
 await act(async()=>summary.click());await navigate('/metodo');assert.equal(host.querySelector('details')!.open,false)
})
test('v2 tokens de texto y navegación conservan contraste AA',async()=>{
 const css=await readFile(new URL('../src/styles/tokens.css',import.meta.url),'utf8')
 const token=(name:string)=>css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))![1]
 const luminance=(hex:string)=>{const c=hex.slice(1).match(/../g)!.map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
 for(const [fg,bg] of [[token('ink'),token('page')],[token('ink'),token('soft')],[token('page'),token('forest')],['#FFD0AD',token('forest')]]) {
 const [a,b]=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);assert.ok((a+.05)/(b+.05)>=4.5,`${fg} sobre ${bg}`)
 }
})
