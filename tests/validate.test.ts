import { describe, expect, it } from 'vitest'
import { validateDataset } from '../src/core/validate'
import { mini } from './fixtures/miniDataset'

function clone(): typeof mini {
  return structuredClone(mini)
}

describe('validateDataset', () => {
  it('accepts a valid dataset and returns it typed', () => {
    expect(validateDataset(mini)).toBe(mini)
  })
  it('rejects non-objects', () => {
    expect(() => validateDataset(null)).toThrow(/not an object/i)
  })
  it('rejects wrong schemaVersion', () => {
    const d = clone(); d.schemaVersion = 99
    expect(() => validateDataset(d)).toThrow(/schemaVersion/)
  })
  it('rejects a color with unknown fineId', () => {
    const d = clone(); d.colors[0].fineId = 'nope'
    expect(() => validateDataset(d)).toThrow(/fineId "nope"/)
  })
  it('rejects a fine group with unknown broad parent', () => {
    const d = clone(); d.groups.fine[0].parentId = 'nope'
    expect(() => validateDataset(d)).toThrow(/parentId "nope"/)
  })
  it('rejects a combination referencing a missing color', () => {
    const d = clone(); d.combinations[0].colorIds = [1, 999]
    expect(() => validateDataset(d)).toThrow(/999/)
  })
  it('rejects size mismatch', () => {
    const d = clone(); d.combinations[0].size = 3
    expect(() => validateDataset(d)).toThrow(/size/)
  })
  it('rejects malformed hex', () => {
    const d = clone(); d.colors[0].hex = 'ffa6d9'
    expect(() => validateDataset(d)).toThrow(/hex/)
  })
  it('rejects duplicate color ids', () => {
    const d = clone(); d.colors[1].id = 1
    expect(() => validateDataset(d)).toThrow(/duplicate/i)
  })
  it('rejects mismatched color↔combination cross-references', () => {
    const d = clone(); d.colors[0].combinationIds = [10]
    expect(() => validateDataset(d)).toThrow(/cross-reference/i)
  })
})
