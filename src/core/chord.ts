// Chord-diagram math: nodes per granularity level and co-occurrence matrix.
// Core kernel: no imports outside src/core.
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
    const order = new Map(ix.data.groups.fine.map((g, i) => [g.id, i]))
    return [...ix.data.colors]
      .sort((a, b) => (order.get(a.fineId)! - order.get(b.fineId)!) || (a.hue - b.hue))
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

export interface AngleGroup { startAngle: number; endAngle: number; index: number }

function broadKeyOf(ix: Indexed, level: GranularityLevel, nodeKey: string): string | null {
  if (level === 0) return ancestorAtLevel(ix, Number(nodeKey.slice(1)), 2)
  if (level === 1) return ix.broadOfFine.get(nodeKey) ?? null
  if (level === 2) return nodeKey
  return null
}

// Arc-angle (radians) to rotate to 12 o'clock so "red" leads. Levels 0-2:
// center of the Red broad-family block (contiguous in family order). Level 3:
// the reddest member's slice within the Warm arc (members are drawn hue-sorted).
export function redAnchorAngle(
  ix: Indexed,
  level: GranularityLevel,
  groups: readonly AngleGroup[],
  nodes: readonly WheelNode[],
): number {
  const redBroad = ix.data.groups.broad.find((g) => g.name === 'Red')
  if (!redBroad) return 0
  if (level === 3) {
    const warmId = ix.superOfBroad.get(redBroad.id)
    const g = groups.find((gr) => nodes[gr.index]?.key === warmId)
    if (!g) return 0
    const members = groupMembers(ix, nodes[g.index].key) // hue-sorted, matches swatchHexes
    if (!members.length) return (g.startAngle + g.endAngle) / 2
    let bestIdx = 0
    let bestD = Infinity
    members.forEach((c, i) => {
      const d = Math.min(c.hue, 360 - c.hue)
      if (d < bestD) { bestD = d; bestIdx = i }
    })
    const f = (bestIdx + 0.5) / members.length
    return g.startAngle + f * (g.endAngle - g.startAngle)
  }
  const reds = groups.filter((g) => broadKeyOf(ix, level, nodes[g.index].key) === redBroad.id)
  if (!reds.length) return 0
  const start = Math.min(...reds.map((g) => g.startAngle))
  const end = Math.max(...reds.map((g) => g.endAngle))
  return (start + end) / 2
}
