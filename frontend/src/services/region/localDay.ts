/** Día local de una zona IANA para un instante UTC (como tz_convert(zona).floor("D") en pandas). */
export class LocalDay {
  private fmt: Intl.DateTimeFormat
  private cache = new Map<number, number>()   // hora UTC (ms / 3.6e6) -> desfase en ms

  readonly zone: string
  constructor(zone: string) {
    this.zone = zone
    this.fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  static valid(zone: string): boolean {
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true } catch { return false }
  }

  private offset(ms: number): number {
    const p: Record<string, number> = {}
    for (const part of this.fmt.formatToParts(new Date(ms))) if (part.type !== 'literal') p[part.type] = Number(part.value)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
  }

  /** Número de día local (días desde 1970-01-01) para el instante UTC en ms. */
  day(utcMs: number): number {
    const hour = Math.floor(utcMs / 3.6e6)
    let off = this.cache.get(hour)
    if (off === undefined) {
      const a = this.offset(hour * 3.6e6), b = this.offset(hour * 3.6e6 + 3.6e6 - 1000)
      off = a === b ? a : NaN                  // hora con cambio de horario: se calcula al minuto
      this.cache.set(hour, off)
    }
    if (Number.isNaN(off)) off = this.offset(utcMs)
    return Math.floor((utcMs + off) / 864e5)
  }
}

export function dayToYmd(day: number): [number, number, number] {
  const d = new Date(day * 864e5)
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
}
