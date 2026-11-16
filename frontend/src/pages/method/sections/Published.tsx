import type { ReactNode } from 'react'
import entries from '../publicCopy.json'
/** Reviewed against the recorded source text; never silently translate unknown revisions. */
export function Published({ children }: { children: ReactNode }) {
  const original = typeof children === 'string' ? children : ''
  const entry = entries.find(row => row.source === original)
  const safeName = original.length < 100 && !/DECISIONS|contract|contrato|aprobado|T29|P11|P15/i.test(original) && !/[.:=]/.test(original)
  return <span className="method-public-copy">{entry?.english ?? (safeName ? original : 'Additional scientific context is available in the original downloadable source file; no verified English version is available for this text.')}</span>
}
