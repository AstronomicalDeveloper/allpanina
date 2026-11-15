// The pipeline writes its warnings in Spanish into procedencia.json (kept identical to the
// Python reference). This only translates them for display; the files are not touched.
const RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Ninguna detección cae dentro de la región: revise el polígono y el área descargada\.$/, () => 'No detection falls inside the region: check the polygon and the downloaded area.'],
  [/^No se ofrece B1: pocos datos en train 2013-2022 \(Σ VIIRS ([\d,]+), Σ MODIS ([\d,]+); mínimo ([\d,]+) y ([\d,]+)\)\. Se muestran solo los datos observados\.$/,
    m => `B1 is not offered: too little data in train 2013-2022 (Σ VIIRS ${m[1]}, Σ MODIS ${m[2]}; minimum ${m[3]} and ${m[4]}). Only observed data are shown.`],
  [/^Mapas de más de 8 MB \((.+)\): conviene una celda más grande\.$/, m => `Maps larger than 8 MB (${m[1]}): a larger cell is advisable.`],
]

export function englishWarning(text: string): string {
  for (const [pattern, render] of RULES) { const m = text.match(pattern); if (m) return render(m) }
  return text
}
