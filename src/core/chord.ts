// Chord-diagram math: nodes per granularity level and co-occurrence matrix.
// Core kernel: no imports outside src/core.
import { isNeutral } from './colorMath'
import type { Indexed } from './dataset'
import {
  ancestorAtLevel, displayableCombinations, groupMembers, sizeBucket,
} from './dataset'
import type { CombinationRecord, GranularityLevel, SizeBucket } from './types'

export interface WheelNode {
  key: string
  label: string
  swatchHexes: string[]
}

export function wheelNodes(ix: Indexed, level: GranularityLevel): WheelNode[] {
  if (level === 0) {
    return [...ix.data.colors]
      .sort((a, b) =>
        Number(isNeutral(a.hex)) - Number(isNeutral(b.hex)) || a.hue - b.hue)
      .map((c) => ({ key: `c${c.id}`, label: c.name, swatchHexes: [c.hex] }))
  }
  const groups =
    level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
  return groups.map((g) => ({
    key: g.id,
    label: g.name,
    swatchHexes: groupMembers(ix, g.id).map((c) => c.hex),
  }))
}

function filteredCombos(ix: Indexed, sizes: ReadonlySet<SizeBucket>): CombinationRecord[] {
  return displayableCombinations(ix).filter((c) => sizes.has(sizeBucket(c)))
}

export function chordMatrix(
  ix: Indexed, level: GranularityLevel, sizes: ReadonlySet<SizeBucket>,
): { nodes: WheelNode[]; matrix: number[][] } {
  const nodes = wheelNodes(ix, level)
  const idx = new Map(nodes.map((n, i) => [n.key, i]))
  const n = nodes.length
  const matrix: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0))

  for (const combo of filteredCombos(ix, sizes)) {
    const positions = new Map<number, number>() // node index → member count
    for (const colorId of combo.colorIds) {
      const i = idx.get(ancestorAtLevel(ix, colorId, level))!
      positions.set(i, (positions.get(i) ?? 0) + 1)
    }
    const keys = [...positions.keys()]
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        matrix[keys[a]][keys[b]] += 1
        matrix[keys[b]][keys[a]] += 1
      }
    }
    for (const [i, count] of positions) {
      if (count >= 2) matrix[i][i] += 1
    }
  }
  return { nodes, matrix }
}

export function combosForPair(
  ix: Indexed, level: GranularityLevel, keyA: string, keyB: string,
  sizes: ReadonlySet<SizeBucket>,
): CombinationRecord[] {
  return filteredCombos(ix, sizes)
    .filter((combo) => {
      const keys = combo.colorIds.map((id) => ancestorAtLevel(ix, id, level))
      if (keyA === keyB) return keys.filter((k) => k === keyA).length >= 2
      return keys.includes(keyA) && keys.includes(keyB)
    })
    .sort((a, b) => a.id - b.id)
}
