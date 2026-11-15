/**
 * Integer ranges of the map's percentile legend.
 *
 * Colors use the original breaks (≤ q25, ≤ q50, ≤ q75, rest). Because `cell_days` is always an integer
 * (the validators require it), v ≤ q exactly when v ≤ ⌊q⌋. So these ranges describe the same values as
 * each color, without decimals or repeated breaks. A range can be empty when two percentiles coincide.
 */
import { OBSERVATION_COLORS } from '../cartography/juanLayers'
import type { ObservationPalette } from '../cartography/juanLayers'

export type LegendRange = { color: string; label: string; range: string }

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

function between(low: number, high: number) {
  if (low > high) return 'No values in this range'
  return low === high ? integer.format(low) : `${integer.format(low)} to ${integer.format(high)}`
}

export function percentileLegend(q25: number, q50: number, q75: number, palette: ObservationPalette = 'dark'): LegendRange[] {
  const [a, b, c] = [Math.floor(q25), Math.floor(q50), Math.floor(q75)]
  const colors = OBSERVATION_COLORS[palette]
  return [
    { color: colors[0], label: 'Up to P25', range: `≤ ${integer.format(a)}` },
    { color: colors[1], label: 'P25–P50', range: between(a + 1, b) },
    { color: colors[2], label: 'P50–P75', range: between(b + 1, c) },
    { color: colors[3], label: 'Above P75', range: `≥ ${integer.format(c + 1)}` },
  ]
}
