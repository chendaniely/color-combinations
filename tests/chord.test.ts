import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chordMatrix, combosForPair, redAnchorAngle, wheelNodes } from '../src/core/chord'
import { index } from '../src/core/dataset'
import { validateDataset } from '../src/core/validate'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const ALL = new Set<2 | 3 | 4>([2, 3, 4])

describe('wheelNodes', () => {
  it('level 0 lists colors, neutrals last', () => {
    const nodes = wheelNodes(ix, 0)
    expect(nodes).toHaveLength(6)
    expect(nodes.at(-1)!.key).toBe('c6') // the gray
    expect(nodes[0].swatchHexes).toHaveLength(1)
  })
  it('level 0 orders by fine-family then hue (browns/grays cluster, neutrals last)', () => {
    // fine order: dusty-pinks, true-reds, deep-blues, grays
    // within dusty-pinks by hue: c2 (316.6) before c1 (325.6); within deep-blues: c5 (200.5) before c4 (206.5)
    expect(wheelNodes(ix, 0).map((n) => n.key)).toEqual(['c2', 'c1', 'c3', 'c5', 'c4', 'c6'])
  })
  it('levels use authored group order', () => {
    expect(wheelNodes(ix, 2).map((n) => n.key)).toEqual(['pink', 'red', 'blue'])
    expect(wheelNodes(ix, 3).map((n) => n.key)).toEqual(['warm', 'cool'])
  })
  it('group nodes carry member swatches', () => {
    const pink = wheelNodes(ix, 2).find((n) => n.key === 'pink')!
    expect(pink.swatchHexes).toEqual(['#ffb3f0', '#ffa6d9']) // hue-sorted
  })
})

describe('chordMatrix', () => {
  // Fixture displayable combos: 10=[1,4] 11=[2,3] 12=[1,4,5] 14=[1,2,3,4,5]
  it('computes the level-3 matrix by hand-check', () => {
    const { nodes, matrix } = chordMatrix(ix, 3, ALL)
    const warm = nodes.findIndex((n) => n.key === 'warm')
    const cool = nodes.findIndex((n) => n.key === 'cool')
    // warm↔cool: combos 10, 12, 14 → 3. warm self: 11 (pink+red), 14. cool self: 12, 14.
    expect(matrix[warm][cool]).toBe(3)
    expect(matrix[cool][warm]).toBe(3)
    expect(matrix[warm][warm]).toBe(2)
    expect(matrix[cool][cool]).toBe(2)
  })
  it('respects the size filter', () => {
    const { nodes, matrix } = chordMatrix(ix, 3, new Set<2 | 3 | 4>([2]))
    const warm = nodes.findIndex((n) => n.key === 'warm')
    const cool = nodes.findIndex((n) => n.key === 'cool')
    expect(matrix[warm][cool]).toBe(1) // only combo 10
    expect(matrix[warm][warm]).toBe(1) // only combo 11
  })
  it('is symmetric on the full real dataset', () => {
    const real = index(validateDataset(
      JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')),
    ))
    for (const level of [0, 1, 2, 3] as const) {
      const { matrix } = chordMatrix(real, level, ALL)
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < i; j++) {
          expect(matrix[i][j]).toBe(matrix[j][i])
        }
      }
    }
  })
})

describe('redAnchorAngle', () => {
  const TAU = 2 * Math.PI
  const equalGroups = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ index: i, startAngle: (i / n) * TAU, endAngle: ((i + 1) / n) * TAU }))

  it('level 2 centers the Red broad block', () => {
    const nodes = wheelNodes(ix, 2) // [pink, red, blue]; red is index 1 of 3
    const a = redAnchorAngle(ix, 2, equalGroups(nodes.length), nodes)
    expect(a).toBeCloseTo(Math.PI) // center of the middle third
  })

  it('level 0 centers the red color block', () => {
    const nodes = wheelNodes(ix, 0) // [c2,c1,c3,c5,c4,c6]; c3 (the red) is index 2 of 6
    const a = redAnchorAngle(ix, 0, equalGroups(nodes.length), nodes)
    expect(a).toBeCloseTo((5 * Math.PI) / 6) // center of slice index 2
  })

  it('level 3 lands on the reddest slice inside Warm (near its start)', () => {
    const nodes = wheelNodes(ix, 3) // [warm, cool]; warm index 0 spans [0, PI]
    const a = redAnchorAngle(ix, 3, equalGroups(nodes.length), nodes)
    // warm members hue-sorted: [c3 6.8, c2 316.6, c1 325.6]; reddest = c3 at idx 0 → f=0.5/3
    expect(a).toBeCloseTo((0.5 / 3) * Math.PI)
    expect(a).toBeLessThan(Math.PI * 0.25)
  })

  it('level 1 merges a multi-node Red block on the real dataset', () => {
    const real = index(validateDataset(JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8'))))
    const TAU = 2 * Math.PI
    const nodes = wheelNodes(real, 1)
    const groups = nodes.map((_, i) => ({
      index: i, startAngle: (i / nodes.length) * TAU, endAngle: ((i + 1) / nodes.length) * TAU,
    }))
    const redBroadId = real.data.groups.broad.find((g) => g.name === 'Red')!.id
    const redIdx = nodes
      .map((n, i) => [n, i] as const)
      .filter(([n]) => real.broadOfFine.get(n.key) === redBroadId)
      .map(([, i]) => i)
    expect(redIdx.length).toBeGreaterThanOrEqual(2) // True Reds + Wine Reds → exercises the min/max merge
    const start = Math.min(...redIdx.map((i) => groups[i].startAngle))
    const end = Math.max(...redIdx.map((i) => groups[i].endAngle))
    expect(redAnchorAngle(real, 1, groups, nodes)).toBeCloseTo((start + end) / 2)
  })
})

describe('combosForPair', () => {
  it('returns the combos linking two nodes', () => {
    expect(combosForPair(ix, 3, 'warm', 'cool', ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForPair(ix, 0, 'c1', 'c4', ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForPair(ix, 0, 'c1', 'c3', new Set<2 | 3 | 4>([2]))).toEqual([])
  })
  it('self-pair returns combos internal to the node', () => {
    expect(combosForPair(ix, 3, 'warm', 'warm', ALL).map((c) => c.id)).toEqual([11, 14])
  })
})
