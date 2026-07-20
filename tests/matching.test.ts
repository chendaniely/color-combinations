import { describe, expect, it } from 'vitest'
import { index } from '../src/core/dataset'
import {
  breadcrumbOf, childGroupsOf, combosForSet, groupKeysOfCombo,
  levelOfGroupKey, remapKeysToLevel, suggestPartners,
} from '../src/core/matching'
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
})
