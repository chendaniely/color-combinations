// Validates that unknown data conforms to the Dataset contract.
// Core kernel: no imports outside src/core.
import type { Dataset } from './types'
import { SCHEMA_VERSION } from './types'

function fail(msg: string): never {
  throw new Error(`Invalid dataset: ${msg}`)
}

const HEX = /^#[0-9a-f]{6}$/

export function validateDataset(data: unknown): Dataset {
  if (typeof data !== 'object' || data === null) fail('not an object')
  const d = data as Dataset

  if (d.schemaVersion !== SCHEMA_VERSION) {
    fail(`schemaVersion ${d.schemaVersion} != expected ${SCHEMA_VERSION}`)
  }
  if (!d.source?.name || !d.source?.retrievedOn) fail('missing source info')
  if (!Array.isArray(d.colors) || d.colors.length === 0) fail('colors missing')
  if (!Array.isArray(d.combinations)) fail('combinations missing')

  const superIds = new Set(d.groups.super.map((g) => g.id))
  const broadIds = new Set(d.groups.broad.map((g) => g.id))
  const fineIds = new Set(d.groups.fine.map((g) => g.id))
  if (superIds.size !== d.groups.super.length) fail('duplicate super group id')
  if (broadIds.size !== d.groups.broad.length) fail('duplicate broad group id')
  if (fineIds.size !== d.groups.fine.length) fail('duplicate fine group id')

  for (const g of d.groups.super) {
    if (g.parentId !== null) fail(`super group "${g.id}" has non-null parent`)
  }
  for (const g of d.groups.broad) {
    if (g.parentId === null || !superIds.has(g.parentId)) {
      fail(`broad group "${g.id}" parentId "${g.parentId}" not a super group`)
    }
  }
  for (const g of d.groups.fine) {
    if (g.parentId === null || !broadIds.has(g.parentId)) {
      fail(`fine group "${g.id}" parentId "${g.parentId}" not a broad group`)
    }
  }

  const colorIds = new Set<number>()
  for (const c of d.colors) {
    if (colorIds.has(c.id)) fail(`duplicate color id ${c.id}`)
    colorIds.add(c.id)
    if (!HEX.test(c.hex)) fail(`color ${c.id} hex "${c.hex}" is not #rrggbb`)
    if (!fineIds.has(c.fineId)) fail(`color ${c.id} fineId "${c.fineId}" unknown`)
    if (c.rgb.length !== 3) fail(`color ${c.id} rgb malformed`)
    if (c.cmyk.length !== 4) fail(`color ${c.id} cmyk malformed`)
  }

  const comboIds = new Set<number>()
  for (const combo of d.combinations) {
    if (comboIds.has(combo.id)) fail(`duplicate combination id ${combo.id}`)
    comboIds.add(combo.id)
    if (combo.size !== combo.colorIds.length) {
      fail(`combination ${combo.id} size ${combo.size} != ${combo.colorIds.length} colors`)
    }
    if (combo.excluded !== (combo.size < 2)) {
      fail(`combination ${combo.id} excluded flag inconsistent with size`)
    }
    for (const id of combo.colorIds) {
      if (!colorIds.has(id)) fail(`combination ${combo.id} references missing color ${id}`)
    }
  }

  // Cross-references must agree both ways.
  for (const c of d.colors) {
    for (const comboId of c.combinationIds) {
      if (!comboIds.has(comboId)) {
        fail(`cross-reference: color ${c.id} lists missing combination ${comboId}`)
      }
    }
  }
  for (const combo of d.combinations) {
    for (const id of combo.colorIds) {
      const color = d.colors.find((c) => c.id === id)!
      if (!color.combinationIds.includes(combo.id)) {
        fail(`cross-reference: combination ${combo.id} lists color ${id} but not vice versa`)
      }
    }
  }

  return d
}
