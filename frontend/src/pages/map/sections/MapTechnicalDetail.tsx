/** Technical detail of a map error, folded under the plain message (same markup as the shared one, in English). */
export default function MapTechnicalDetail({ detail }: { detail?: string | null }) {
  if (!detail) return null
  return <details className="technical-detail"><summary>Technical detail</summary><code>{detail}</code></details>
}
