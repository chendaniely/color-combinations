import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chordMatrix, combosForPair, wheelNodes } from '../src/core/chord'
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
