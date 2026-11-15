import type { ReactNode } from 'react'
/** Text quoted from method.json / validation.json as the science team published it (Spanish). Not translated, to keep it verbatim. */
export function Published({ children }: { children: ReactNode }) {
  return <span lang="es" className="method-original">{children}<span className="method-original-tag" aria-label="original text in Spanish" title="Original text in Spanish">ES</span></span>
}
