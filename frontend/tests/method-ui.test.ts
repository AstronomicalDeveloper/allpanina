import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, createElement } from 'react'
import EvaluationSection from '../src/pages/method/sections/EvaluationSection'
import type { ValidationResult } from '../src/types/data'
import { files, mockFiles, mount, click, navigate } from './uiHarness'

test('v2 Método muestra archivos conforme llegan sin esperar al último',async t=>{
 let release:((response:Response)=>void)|undefined
 t.mock.method(globalThis,'fetch',(url:string)=>url.endsWith('validation.json')?new Promise<Response>(resolve=>{release=resolve}):Promise.resolve(new Response(files[url])))
 const {host}=await mount(t,'/metodo');assert.ok(host.querySelector('.method-definition'));assert.match(host.querySelector('[role="status"]')!.textContent!,/Cargando/)
 await act(async()=>release!(new Response(files['/data/validation.json'])))
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'30.8%')
})
test('v2 Método conserva evaluación precisa cuando falla la explicación',async t=>{
 mockFiles(t,{'/data/method.json':'{}'});const {host}=await mount(t,'/metodo')
 assert.match(host.querySelector('[role="alert"]')!.textContent!,/method.json/)
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'30.8%')
})
test('v2 Método conserva explicación y validación cuando falla el archivo de prueba',async t=>{
 mockFiles(t,{'/data/validation.json':'{}'});const {host}=await mount(t,'/metodo')
 assert.ok(host.querySelector('.method-definition'));assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'No disponible')
 await click(host,'Validación');assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'17.8%')
})
test('v2 evaluación respeta splits declarados aunque el archivo contenga entrenamiento',async t=>{
 const validation:ValidationResult={region_id:'TEST',methods:{B0:{split:'train',metrics:{mae:0,wape:0,bias:-1},n_months_matched:2,detalle_mensual:'no disponible'}}}
 const {host}=await mount(t,'/metodo',createElement(EvaluationSection,{method:null,validation,demo:false}))
 assert.equal(host.querySelector('.method-wape--B0 strong')!.textContent,'No disponible')
 await click(host,'Entrenamiento');assert.equal(host.querySelector('.method-wape--B0 strong')!.textContent,'0.0%')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'No disponible')
 assert.match(host.textContent!,/Detalle mensual de prueba no disponible/)
})
test('v2 evaluación no fabrica residuos cuando solo hay métricas globales',async t=>{
 const validation:ValidationResult={region_id:'TEST',methods:{B1:{split:'test',metrics:{mae:0,wape:null,bias:0},n_months_matched:0,detalle_mensual:'no disponible'}}}
 const {host}=await mount(t,'/metodo',createElement(EvaluationSection,{method:null,validation,demo:false}))
 assert.equal(host.querySelector('[aria-label="Errores mensuales de prueba"]'),null)
 assert.match(host.textContent!,/Detalle mensual de prueba no disponible/)
 assert.match(host.querySelector('[aria-label="Todas las métricas publicadas"]')!.textContent!,/0.0No disponible0.0/)
})
test('v2 Método navega por rutas reales y conserva parámetros exploratorios',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9')
 await act(async()=>[...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a=>a.textContent==='Method')!.click())
 assert.equal(host.querySelector('h1')!.textContent,'Método y evaluación')
 assert.equal(new URLSearchParams(window.location.search).get('periodMonth'),'9')
 await navigate('/calendario?periodYear=2024&periodMonth=9');assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2,323')
})
