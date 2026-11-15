/**
 * Detalle técnico de un error, plegado bajo el mensaje comprensible.
 * Conserva el texto original (archivo, código HTTP, causa) para el equipo y para reportar fallos,
 * sin ponerlo en primer plano para quien explora los datos.
 */
export default function TechnicalDetail({ detail }: { detail?: string | null }) {
  if (!detail) return null
  return <details className="technical-detail"><summary>Detalle técnico</summary><code>{detail}</code></details>
}
