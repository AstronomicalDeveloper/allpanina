import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import entries from '../src/pages/method/publicCopy.json'

test('F6 public explanations match their recorded scientific source version', () => {
  for (const entry of entries) {
    const bytes = readFileSync(new URL(`../public/data/${entry.file}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256)
    let value: unknown = JSON.parse(bytes.toString('utf8'))
    for (const key of entry.field.replace(/\[(\d+)\]/g, '.$1').split('.')) value = (value as Record<string, unknown>)[key]
    assert.equal(value, entry.source)
    assert.ok(entry.english.length > 0)
    assert.doesNotMatch(entry.english, /DECISIONS|REVISION_|aprobado por|P11|P15|T29|\?/)
  }
})
