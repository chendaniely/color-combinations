import { describe, expect, it } from 'vitest'
import { ancestorAtLevel, index, keyColorId } from '../src/core/dataset'
import {
  breadcrumbOf, childGroupsOf, combosForSet, groupKeysOfCombo,
  levelOfGroupKey, remapKeysToLevel, suggestPartners,
} from '../src/core/matching'
import { dataset } from '../src/data'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const ALL = new Set<2 | 3 | 4>([2, 3, 4])

describe('group hierarchy helpers', () => {
  it('levelOfGroupKey classifies fine/broad/super', () => {
    expect(levelOfGroupKey(ix, 'dusty-pinks')).toBe(1)
    expect(levelOfGroupKey(ix, 'pink')).toBe(2)
    expect(levelOfGroupKey(ix, 'warm')).toBe(3)
  })
  it('breadcrumbOf returns top→key inclusive', () => {
    expect(breadcrumbOf(ix, 'dusty-pinks').map((g) => g.id)).toEqual(['warm', 'pink', 'dusty-pinks'])
    expect(breadcrumbOf(ix, 'pink').map((g) => g.id)).toEqual(['warm', 'pink'])
    expect(breadcrumbOf(ix, 'warm').map((g) => g.id)).toEqual(['warm'])
  })
  it('childGroupsOf returns direct children; fine has none', () => {
    expect(childGroupsOf(ix, 'warm').map((g) => g.id)).toEqual(['pink', 'red'])
    expect(childGroupsOf(ix, 'pink').map((g) => g.id)).toEqual(['dusty-pinks'])
    expect(childGroupsOf(ix, 'dusty-pinks')).toEqual([])
  })
  it('groupKeysOfCombo maps colors to unique level keys', () => {
    expect(groupKeysOfCombo(ix, ix.comboById.get(14)!, 1).sort())
      .toEqual(['deep-blues', 'dusty-pinks', 'true-reds'])
    expect(groupKeysOfCombo(ix, ix.comboById.get(10)!, 2).sort()).toEqual(['blue', 'pink'])
  })
  it('remapKeysToLevel: coarser maps+dedupes, finer clears', () => {
    expect(remapKeysToLevel(ix, ['dusty-pinks', 'deep-blues'], 1, 2)).toEqual(['pink', 'blue'])
    expect(remapKeysToLevel(ix, ['pink'], 2, 1)).toEqual([])
    expect(remapKeysToLevel(ix, ['pink'], 2, 2)).toEqual(['pink'])
  })
})

describe('combosForSet', () => {
  it('single key: all displayable combos containing it, size then id', () => {
    expect(combosForSet(ix, 1, ['dusty-pinks'], ALL).map((c) => c.id)).toEqual([10, 11, 12, 14])
  })
  it('multi key: superset combos only', () => {
    expect(combosForSet(ix, 1, ['dusty-pinks', 'deep-blues'], ALL).map((c) => c.id)).toEqual([10, 12, 14])
  })
  it('excludes quirk combos and non-supersets', () => {
    expect(combosForSet(ix, 1, ['true-reds'], ALL).map((c) => c.id)).toEqual([11, 14])
  })
  it('respects a restricted size set', () => {
    // only 2-color combos: 10=[1,4] and 11=[2,3] contain dusty-pinks; 12 (size3), 14 (size5) drop
    expect(combosForSet(ix, 1, ['dusty-pinks'], new Set<2 | 3 | 4>([2])).map((c) => c.id)).toEqual([10, 11])
  })
})

describe('suggestPartners', () => {
  it('single key ranks partners by co-occurrence', () => {
    expect(suggestPartners(ix, 1, ['dusty-pinks'], ALL)).toEqual([
      { key: 'deep-blues', score: 3, bookVerified: true },
      { key: 'true-reds', score: 2, bookVerified: true },
    ])
  })
  it('multi key keeps only shades pairing with ALL members', () => {
    expect(suggestPartners(ix, 1, ['dusty-pinks', 'deep-blues'], ALL)).toEqual([
      { key: 'true-reds', score: 3, bookVerified: true },
    ])
  })
  it('works at the broad level', () => {
    expect(suggestPartners(ix, 2, ['pink'], ALL).map((p) => p.key)).toEqual(['blue', 'red'])
  })
  it('empty set returns nothing', () => {
    expect(suggestPartners(ix, 1, [], ALL)).toEqual([])
  })
  it('works at the super-group level (3)', () => {
    // warm = {pink,red}, cool = {blue+grays}; combos link them
    const res = suggestPartners(ix, 3, ['warm'], ALL)
    expect(res.map((p) => p.key)).toEqual(['cool'])
  })
})

describe('allowed-combo filter seam (matching)', () => {
  it('combosForSet respects allowed', () => {
    expect(combosForSet(ix, 2, ['blue'], ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForSet(ix, 2, ['blue'], ALL, new Set([10])).map((c) => c.id)).toEqual([10])
  })
  it('suggestPartners respects allowed (drops partners with no allowed combo)', () => {
    const full = suggestPartners(ix, 2, ['pink'], ALL).map((s) => s.key)
    expect(full).toContain('blue')
    expect(full).toContain('red')
    const restricted = suggestPartners(ix, 2, ['pink'], ALL, new Set([10, 12])).map((s) => s.key)
    expect(restricted).toContain('blue')
    expect(restricted).not.toContain('red')
  })
})

describe('level 0 matching', () => {
  const sizes = new Set<2 | 3 | 4>([2, 3, 4])
  it('remaps a color key up to shade and family, and refuses to go finer', () => {
    const fine = ancestorAtLevel(dataset, 1, 1)
    const broad = ancestorAtLevel(dataset, 1, 2)
    expect(remapKeysToLevel(dataset, ['c1'], 0, 1)).toEqual([fine])
    expect(remapKeysToLevel(dataset, ['c1'], 0, 2)).toEqual([broad])
    expect(remapKeysToLevel(dataset, [fine], 1, 0)).toEqual([])   // finer: cannot pick
    expect(remapKeysToLevel(dataset, ['c1'], 0, 0)).toEqual(['c1'])
  })
  it('suggests partner colors as color keys', () => {
    const out = suggestPartners(dataset, 0, ['c1'], sizes)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => /^c\d+$/.test(s.key))).toBe(true)
    expect(out.every((s) => keyColorId(s.key) !== 1)).toBe(true) // never suggests itself
  })
})
