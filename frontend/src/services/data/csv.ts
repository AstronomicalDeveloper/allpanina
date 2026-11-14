/** Small RFC-style comma-separated reader, including quoted commas/newlines. */
export function readCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false, closed = false
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
    } else if (char === ',' || char === '\n') {
      row.push(field); field = ''; closed = false
      if (char === '\n') { rows.push(row); row = [] }
    } else if (char === '"' && field === '' && !closed) quoted = true
    else {
      if (closed || char === '"' || char === '\r') throw new Error('CSV: comillas o separadores incorrectos')
      field += char
    }
  }
  if (quoted) throw new Error('CSV: comillas sin cerrar')
  if (field !== '' || row.length || closed) { row.push(field); rows.push(row) }
  if (!rows.length) throw new Error('CSV vacío')
  return rows
}
