/**
 * Rangos de la leyenda por percentiles del mapa, expresados en enteros.
 *
 * Los colores se asignan con los cortes originales (≤ q25, ≤ q50, ≤ q75, resto). Como `cell_days`
 * es siempre entero (lo exigen los validadores), un valor v cumple v ≤ q exactamente cuando
 * v ≤ ⌊q⌋. Por eso estos rangos describen los mismos valores que cada color, sin decimales ni
 * cortes repetidos. Un tramo puede quedar vacío cuando dos percentiles coinciden.
 */
export type LegendRange = { color: string; label: string; range: string }

const integer = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

function between(low: number, high: number) {
  if (low > high) return 'Sin valores en este tramo'
  return low === high ? integer.format(low) : `${integer.format(low)} a ${integer.format(high)}`
}

export function percentileLegend(q25: number, q50: number, q75: number): LegendRange[] {
  const [a, b, c] = [Math.floor(q25), Math.floor(q50), Math.floor(q75)]
  return [
    { color: '#FEE2E2', label: 'Hasta P25', range: `≤ ${integer.format(a)}` },
    { color: '#FCA5A5', label: 'P25–P50', range: between(a + 1, b) },
    { color: '#EF4444', label: 'P50–P75', range: between(b + 1, c) },
    { color: '#991B1B', label: 'Sobre P75', range: `≥ ${integer.format(c + 1)}` },
  ]
}
