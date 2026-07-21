import { describe, expect, it } from 'vitest'
import {
  ancestorAtLevel, combinationsForColor, displayableCombinations,
  groupMembers, index, searchColors, sizeBucket,
  isColorKey, keyColorId, keyName, keySwatches,
} from '../src/core/dataset'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)

describe('dataset queries', () => {
  it('indexes lookups', () => {
    expect(ix.colorById.get(1)!.name).toBe('Test Pink A')
    expect(ix.comboById.get(12)!.size).toBe(3)
    expect(ix.groupById.get('pink')!.name).toBe('Pink')
  })
  it('displayable excludes the quirk combos', () => {
    expect(displayableCombinations(ix).map((c) => c.id)).toEqual([10, 11, 12, 14])
  })
  it('buckets sizes with 5-color under 4', () => {
    expect(sizeBucket(ix.comboById.get(10)!)).toBe(2)
    expect(sizeBucket(ix.comboById.get(12)!)).toBe(3)
    expect(sizeBucket(ix.comboById.get(14)!)).toBe(4)
  })
  it('lists combinations for a color, excluding quirks', () => {
    expect(combinationsForColor(ix, 3).map((c) => c.id)).toEqual([11, 14])
    expect(combinationsForColor(ix, 6)).toEqual([])
  })
  it('searches names case-insensitively', () => {
    expect(searchColors(ix, 'pink').map((c) => c.id)).toEqual([1, 2])
    expect(searchColors(ix, 'BLUE').map((c) => c.id)).toEqual([4, 5])
    expect(searchColors(ix, '')).toEqual([])
  })
  it('walks ancestors per level', () => {
    expect(ancestorAtLevel(ix, 1, 0)).toBe('c1')
    expect(ancestorAtLevel(ix, 1, 1)).toBe('dusty-pinks')
    expect(ancestorAtLevel(ix, 1, 2)).toBe('pink')
    expect(ancestorAtLevel(ix, 1, 3)).toBe('warm')
  })
  it('collects group members at any level, hue-sorted', () => {
    expect(groupMembers(ix, 'dusty-pinks').map((c) => c.id)).toEqual([2, 1])
    expect(groupMembers(ix, 'cool').map((c) => c.id)).toEqual([6, 5, 4])
  })
})

describe('key display helpers', () => {
  it('detects color keys but not group ids', () => {
    expect(isColorKey('c1')).toBe(true)
    expect(isColorKey('olives')).toBe(false)
    expect(isColorKey('cool')).toBe(false) // starts with c, not /^c\d+$/
    expect(keyColorId('c1')).toBe(1)
  })
  it('names and swatches a color key', () => {
    expect(keyName(ix, 'c1')).toBe('Test Pink A')
    expect(keySwatches(ix, 'c1')).toEqual(['#ffa6d9'])
  })
  it('names and swatches a group key', () => {
    expect(keyName(ix, 'blue')).toBe('Blue')
    expect(keySwatches(ix, 'blue').length).toBeGreaterThan(1)
  })
})
