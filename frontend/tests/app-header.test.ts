import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { act, createElement, Fragment } from 'react'
import TopBar from '../src/shell/TopBar'
import Footer from '../src/shell/Footer'
import { dom, files, mockFiles, mount, navigate } from './uiHarness'

const shell = () => createElement(Fragment, null, createElement(TopBar), createElement(Footer))
const desktopNav = (host: HTMLElement) => host.querySelector<HTMLElement>('header > div nav[aria-label="Main navigation"]')!
const menuButton = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('button[aria-controls="mobile-menu"]')!

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
test('barra: las vistas de exploración conservan URL y hash; enlaces reales, sin roles de pestaña',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?scope=month&periodYear=2024#detalle',shell())
 const links=[...desktopNav(host).querySelectorAll<HTMLAnchorElement>('a')]
 assert.deepEqual(links.map(a=>a.textContent),['Home','Calendar','Map','Method','My region','About'])
 for(const link of links){
  const url=new URL(link.href),scoped=['/calendar','/map','/method'].includes(url.pathname)
  assert.equal(url.searchParams.get('periodYear'),scoped?'2024':null,link.textContent!)
  assert.equal(url.hash,scoped?'#detalle':'',link.textContent!)
 }
 assert.equal(host.querySelector('[role="tab"]'),null)
 await act(async()=>links.find(a=>a.textContent==='Method')!.click())
 assert.equal(window.location.pathname,'/method');assert.equal(desktopNav(host).querySelector('[aria-current="page"]')!.textContent,'Method')
 assert.equal(window.location.hash,'#detalle')
})
test('barra: el selector de ámbito sólo aparece en Calendario, Mapa y Método',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar',shell(),'peru')
 assert.ok(host.querySelector('select[aria-label="Area"]'))
 assert.equal(host.querySelectorAll('select[aria-label="Area"]').length,1,'un solo selector en el DOM')
 for(const path of ['/','/about','/my-region']){await navigate(path);assert.equal(host.querySelector('select[aria-label="Area"]'),null,path)}
 await navigate('/map');assert.ok(host.querySelector('select[aria-label="Area"]'))
})
test('menú móvil: abre, enfoca el primer enlace, cierra con Escape y devuelve el foco',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar',shell())
 const button=menuButton(host)
 assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(button.getAttribute('aria-label'),'Open menu')
 assert.equal(host.querySelector('#mobile-menu'),null)
 await act(async()=>button.click())
 assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(button.getAttribute('aria-label'),'Close menu')
 const menu=host.querySelector('#mobile-menu')!
 assert.ok(menu);assert.equal(document.activeElement,menu.querySelector('a'))
 assert.equal(menu.querySelector('[aria-current="page"]')!.textContent,'Calendar')
 await act(async()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 assert.equal(host.querySelector('#mobile-menu'),null);assert.equal(document.activeElement,button)
 assert.equal(button.getAttribute('aria-expanded'),'false')
})
test('menú móvil: se cierra al navegar',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024',shell())
 await act(async()=>menuButton(host).click())
 const map=[...host.querySelectorAll<HTMLAnchorElement>('#mobile-menu a')].find(a=>a.textContent==='Map')!
 assert.equal(new URL(map.href).searchParams.get('periodYear'),'2024')
 await act(async()=>map.click())
 assert.equal(window.location.pathname,'/map');assert.equal(host.querySelector('#mobile-menu'),null)
 await act(async()=>menuButton(host).click());await navigate('/method');assert.equal(host.querySelector('#mobile-menu'),null)
})
test('menú móvil: ofrece volver a Perú desde el piloto',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?data=pilot&mapRegion=PE-UCA&periodYear=2024',shell())
 await act(async()=>menuButton(host).click())
 const back=[...host.querySelectorAll<HTMLAnchorElement>('#mobile-menu a')].find(a=>a.textContent==='Back to Peru')!
 const url=new URL(back.href)
 assert.equal(url.pathname,'/calendar');assert.equal(url.searchParams.get('data'),null);assert.equal(url.searchParams.get('mapRegion'),null);assert.equal(url.searchParams.get('periodYear'),'2024')
})
test('pie: enlaza el manifiesto del conjunto de datos activo y nunca una ruta local:',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar',shell(),'peru')
 const footer=()=>host.querySelector('footer')!
 assert.match(footer().querySelector('a[href="/data/peru/manifest.json"]')!.textContent!,/Peru v1\.1/)
 await navigate('/calendar?data=pilot&mapRegion=PE-UCA');assert.match(footer().querySelector('a[href="/data/manifest.json"]')!.textContent!,/Ucayali pilot v1\.0/)
 await navigate('/map?data=demo');assert.match(footer().querySelector('a[href="/data/demo/manifest.json"]')!.textContent!,/DEMO/)
 await navigate('/method?mapRegion=PE-05');assert.ok(footer().querySelector('a[href="/data/peru/manifest.json"]'))
 await navigate('/calendar?data=local&mapRegion=X');assert.equal(footer().querySelector('a[href^="local:"]'),null)
 assert.match(footer().querySelector('a[href="/my-region"]')!.textContent!,/My region/)
 assert.match(footer().textContent!,/We acknowledge the use of data and\/or imagery from NASA's Fire Information for Resource Management System/)
})
test('el pie no aparece en el mapa a pantalla completa; el enlace de salto lleva al contenido',async t=>{
 mockFiles(t);const {host}=await mount(t,'/about')
 assert.ok(host.querySelector('footer'))
 const skip=host.querySelector<HTMLAnchorElement>('a[href="#main"]')!
 assert.equal(skip.textContent,'Skip to content');assert.ok(host.querySelector('main#main'))
 await navigate('/map?periodYear=2024');assert.equal(host.querySelector('footer'),null)
})
test('tokens de color de la barra, el pie y el texto cumplen contraste AA',async()=>{
 const css=await readFile(new URL('../src/styles/app.css',import.meta.url),'utf8')
 const token=(name:string)=>css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`))![1]
 const luminance=(hex:string)=>{const c=hex.slice(1).match(/../g)!.map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
 const ratio=(fg:string,bg:string)=>{const [a,b]=[luminance(fg),luminance(bg)].sort((x,y)=>y-x);return (a+.05)/(b+.05)}
 for(const [fg,bg] of [['ink','paper'],['muted','paper'],['cinder','paper'],['mist','night'],['mist','orbit'],['ember','night']] as const)
  assert.ok(ratio(token(fg),token(bg))>=4.5,`${fg} sobre ${bg}: ${ratio(token(fg),token(bg)).toFixed(2)}`)
 assert.ok(ratio('#FFFFFF',token('night'))>=7,'blanco sobre noche')
 assert.ok(ratio('#FFFFFF',token('cinder'))>=4.5,'blanco sobre ascua (botón primario)')
 assert.ok(ratio(token('ink'),token('ember'))>=4.5,'tinta sobre brasa (botón sobre fondo oscuro)')
})
