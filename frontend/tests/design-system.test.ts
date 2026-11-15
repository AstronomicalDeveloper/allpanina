import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { formatCount, formatMonth, formatPercent } from '../src/ui/format'
import { FIRE_DARK, FIRE_DARK_TEXT, FIRE_LIGHT, FIRE_LIGHT_TEXT } from '../src/ui/fireColors'

const luminance = (hex: string) => {
  const c = hex.slice(1).match(/../g)!.map(n => parseInt(n, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
}
const ratio = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('tokens A2: los pares de texto cumplen contraste AA', async () => {
  const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')
  const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))![1]
  for (const [fg, bg] of [['ink', 'paper'], ['muted', 'paper'], ['paper', 'night'], ['paper', 'orbit'], ['ink', 'ember']] as const)
    assert.ok(ratio(token(fg), token(bg)) >= 4.5, `${fg} sobre ${bg}: ${ratio(token(fg), token(bg)).toFixed(2)}`)
  assert.ok(ratio('#FFFFFF', token('cinder')) >= 4.5, 'texto blanco sobre Ascua')
  assert.ok(ratio(token('ember'), token('night')) >= 4.5, 'Brasa sobre Noche')
})

test('escala de fuego: 9 pasos monótonos y texto legible en cada celda', () => {
  for (const [scale, text, sentido] of [[FIRE_LIGHT, FIRE_LIGHT_TEXT, -1], [FIRE_DARK, FIRE_DARK_TEXT, 1]] as const) {
    assert.equal(scale.length, 9)
    for (let i = 1; i < 9; i++) assert.ok(Math.sign(luminance(scale[i]) - luminance(scale[i - 1])) === sentido, `paso ${i}`)
    scale.forEach((color, i) => assert.ok(ratio(color, text[i]) >= 4, `${color} con ${text[i]}`))
  }
})

test('Tailwind usa los mismos valores que tokens.css', async () => {
  const [tokens, app] = await Promise.all(['tokens.css', 'app.css'].map(f => readFile(new URL(`../src/styles/${f}`, import.meta.url), 'utf8')))
  for (const [name, theme] of [['night', 'night'], ['paper', 'paper'], ['ink', 'ink'], ['ember', 'ember'], ['cinder', 'cinder'], ['fire-9', 'fire-9'], ['glow-9', 'glow-9']])
    assert.equal(app.match(new RegExp(`--color-${theme}:\\s*(#[0-9A-Fa-f]{6})`))![1], tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))![1], name)
  assert.doesNotMatch(app, /@import "tailwindcss";/, 'sin preflight: las páginas aún no rediseñadas conservan su CSS')
  for (const size of [...app.matchAll(/--text-[a-z0-9]+:\s*([\d.]+)rem/g)].map(m => Number(m[1]) * 16)) assert.ok(size >= 13, `texto de ${size}px`)
})

test('fuentes autoalojadas, sin CDN, y documento en inglés', async () => {
  const [fonts, html, pkg] = await Promise.all([readFile(new URL('../src/styles/fonts.css', import.meta.url), 'utf8'), readFile(new URL('../index.html', import.meta.url), 'utf8'), readFile(new URL('../package.json', import.meta.url), 'utf8')])
  assert.match(fonts, /@fontsource\/ibm-plex-sans\//); assert.match(fonts, /@fontsource\/ibm-plex-sans-condensed\//)
  assert.doesNotMatch(fonts + html, /fonts\.googleapis|fonts\.gstatic/)
  assert.ok(JSON.parse(pkg).dependencies['@fontsource/ibm-plex-sans'])
  assert.match(html, /<html lang="en">/); assert.match(html, /og:title/); assert.match(html, /#0B1736/)
})

test('formatos en inglés: conteos enteros, meses y porcentajes', () => {
  assert.equal(formatCount(25046), '25,046'); assert.equal(formatCount(4200.4), '4,200'); assert.equal(formatCount(null), 'No data')
  assert.equal(formatMonth(2024, 8), 'Aug 2024'); assert.equal(formatMonth(2026, 7, true), 'July 2026')
  assert.equal(formatPercent(0.308), '30.8%'); assert.equal(formatPercent(null), 'Not available')
})
