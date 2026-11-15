/** ZIP mínimo sin dependencias: escribe sin comprimir (STORE) y lee STORE o DEFLATE. */
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

export function escribirZip(archivos: Record<string, string | Uint8Array>): Blob {
  const enc = new TextEncoder(), partes: BlobPart[] = [], central: Uint8Array[] = []
  let offset = 0
  const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const data = typeof contenido === 'string' ? enc.encode(contenido) : contenido, name = enc.encode(nombre), crc = crc32(data)
    const h = new DataView(new ArrayBuffer(30))
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true)
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true)
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true)
    partes.push(h.buffer, name as BlobPart, data as BlobPart)
    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true)
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true)
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true)
    const entry = new Uint8Array(46 + name.length); entry.set(new Uint8Array(c.buffer)); entry.set(name, 46)
    central.push(entry)
    offset += 30 + name.length + data.length
  }
  const size = central.reduce((a, c) => a + c.length, 0), end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, central.length, true); end.setUint16(10, central.length, true)
  end.setUint32(12, size, true); end.setUint32(16, offset, true)
  return new Blob([...partes, ...central as BlobPart[], end.buffer], { type: 'application/zip' })
}

async function inflar(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Devuelve {ruta: bytes}. Lee el directorio central (sirve también para zips de FIRMS y de Windows). */
export async function leerZip(buffer: ArrayBuffer): Promise<Record<string, Uint8Array>> {
  const b = new Uint8Array(buffer), v = new DataView(buffer)
  let e = b.length - 22
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error('El archivo no es un .zip válido.')
  const n = v.getUint16(e + 10, true)
  let p = v.getUint32(e + 16, true)
  const out: Record<string, Uint8Array> = {}, dec = new TextDecoder()
  for (let i = 0; i < n; i++) {
    if (p + 46 > b.length) throw new Error('El .zip está truncado.')
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('El .zip está dañado.')
    const metodo = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true)
    const ln = v.getUint16(p + 28, true), lx = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true)
    const nombre = dec.decode(b.subarray(p + 46, p + 46 + ln))
    const crc = v.getUint32(p + 16, true), size = v.getUint32(p + 24, true)
    if (v.getUint16(p + 8, true) & 1) throw new Error('No se admiten archivos ZIP cifrados.')
    p += 46 + ln + lx + lc
    if (nombre.endsWith('/')) continue
    if (Object.hasOwn(out, nombre)) throw new Error(`Nombre de archivo duplicado: ${nombre}`)
    if (local + 30 > b.length || v.getUint32(local, true) !== 0x04034b50) throw new Error('El .zip está dañado.')
    const inicio = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    if (inicio + comp > b.length) throw new Error('El .zip está truncado.')
    const data = b.subarray(inicio, inicio + comp)
    if (metodo === 0) out[nombre] = data.slice()
    else if (metodo === 8) out[nombre] = await inflar(data)
    else throw new Error(`${nombre}: compresión no soportada (método ${metodo}).`)
    if (out[nombre].length !== size || crc32(out[nombre]) !== crc) throw new Error(`${nombre}: el contenido del .zip está dañado (CRC o tamaño incorrecto).`)
  }
  return out
}
