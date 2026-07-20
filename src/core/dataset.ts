// Indexing and query helpers over a validated Dataset.
// Core kernel: no imports outside src/core.
import type {
  ColorRecord, CombinationRecord, Dataset, GranularityLevel, GroupNode, SizeBucket,
} from './types'

export interface Indexed {
  data: Dataset
  colorById: Map<number, ColorRecord>
  comboById: Map<number, CombinationRecord>
  groupById: Map<string, GroupNode>
  broadOfFine: Map<string, string>
  superOfBroad: Map<string, string>
  colorsOfFine: Map<string, number[]>
}

export function index(data: Dataset): Indexed {
  const colorById = new Map(data.colors.map((c) => [c.id, c]))
  const comboById = new Map(data.combinations.map((c) => [c.id, c]))
  const groupById = new Map(
    [...data.groups.fine, ...data.groups.broad, ...data.groups.super].map((g) => [g.id, g]),
  )
  const broadOfFine = new Map(data.groups.fine.map((f) => [f.id, f.parentId!]))
  const superOfBroad = new Map(data.groups.broad.map((b) => [b.id, b.parentId!]))
  const colorsOfFine = new Map<string, number[]>()
  for (const c of data.colors) {
    const list = colorsOfFine.get(c.fineId) ?? []
    list.push(c.id)
    colorsOfFine.set(c.fineId, list)
  }
  return { data, colorById, comboById, groupById, broadOfFine, superOfBroad, colorsOfFine }
}

export function displayableCombinations(ix: Indexed): CombinationRecord[] {
  return ix.data.combinations.filter((c) => !c.excluded)
}

export function sizeBucket(c: CombinationRecord): SizeBucket {
  return c.size >= 4 ? 4 : (c.size as SizeBucket)
}

export function combinationsForColor(ix: Indexed, colorId: number): CombinationRecord[] {
  const color = ix.colorById.get(colorId)
  if (!color) return []
  return color.combinationIds
    .map((id) => ix.comboById.get(id)!)
    .filter((c) => !c.excluded)
    .sort((a, b) => a.id - b.id)
}

export function searchColors(ix: Indexed, query: string): ColorRecord[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  return ix.data.colors
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => a.id - b.id)
}

export function ancestorAtLevel(ix: Indexed, colorId: number, level: GranularityLevel): string {
  if (level === 0) return `c${colorId}`
  const fineId = ix.colorById.get(colorId)!.fineId
  if (level === 1) return fineId
  const broadId = ix.broadOfFine.get(fineId)!
  if (level === 2) return broadId
  return ix.superOfBroad.get(broadId)!
}

export function groupMembers(ix: Indexed, groupId: string): ColorRecord[] {
  const members = ix.data.colors.filter((c) => {
    const fine = c.fineId
    const broad = ix.broadOfFine.get(fine)!
    const sup = ix.superOfBroad.get(broad)!
    return groupId === fine || groupId === broad || groupId === sup
  })
  return members.sort((a, b) => a.hue - b.hue)
}
