// Matching engine + group-hierarchy navigation. Pure core kernel: no imports
// outside src/core. Surfaced by the group panel and the Match page.
import { ancestorAtLevel, displayableCombinations, keyColorId, sizeBucket, type Indexed } from './dataset'
import type { MatchLevel } from './state'
import type { CombinationRecord, GranularityLevel, GroupNode, SizeBucket } from './types'

export type GroupLevel = 1 | 2 | 3
export interface PartnerSuggestion { key: string; score: number; bookVerified: boolean }

export function levelOfGroupKey(ix: Indexed, key: string): GroupLevel {
  if (ix.broadOfFine.has(key)) return 1
  if (ix.superOfBroad.has(key)) return 2
  return 3
}

export function breadcrumbOf(ix: Indexed, key: string): GroupNode[] {
  const node = ix.groupById.get(key)!
  const level = levelOfGroupKey(ix, key)
  if (level === 1) {
    const broad = ix.broadOfFine.get(key)!
    const sup = ix.superOfBroad.get(broad)!
    return [ix.groupById.get(sup)!, ix.groupById.get(broad)!, node]
  }
  if (level === 2) {
    const sup = ix.superOfBroad.get(key)!
    return [ix.groupById.get(sup)!, node]
  }
  return [node]
}

export function childGroupsOf(ix: Indexed, key: string): GroupNode[] {
  const level = levelOfGroupKey(ix, key)
  if (level === 3) return ix.data.groups.broad.filter((b) => b.parentId === key)
  if (level === 2) return ix.data.groups.fine.filter((f) => f.parentId === key)
  return []
}

export function groupKeysOfCombo(
  ix: Indexed, combo: CombinationRecord, level: GranularityLevel,
): string[] {
  return [...new Set(combo.colorIds.map((id) => ancestorAtLevel(ix, id, level)))]
}

export function remapKeysToLevel(
  ix: Indexed, keys: readonly string[], from: MatchLevel, to: MatchLevel,
): string[] {
  if (to === from) return [...keys]
  if (to < from) return [] // finer: cannot uniquely pick a narrower key
  // coarser: lift each key up to `to`
  if (from === 0) {
    return [...new Set(keys.map((k) => ancestorAtLevel(ix, keyColorId(k), to)))]
  }
  // from === 1, to === 2
  return [...new Set(keys.map((k) => ix.broadOfFine.get(k)!))]
}

function filtered(
  ix: Indexed, sizes: ReadonlySet<SizeBucket>, allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  return displayableCombinations(ix).filter(
    (c) => sizes.has(sizeBucket(c)) && (!allowed || allowed.has(c.id)),
  )
}

export function combosForSet(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
  allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  if (setKeys.length === 0) return []
  return filtered(ix, sizes, allowed)
    .filter((c) => {
      const keys = new Set(groupKeysOfCombo(ix, c, level))
      return setKeys.every((k) => keys.has(k))
    })
    .sort((a, b) => a.size - b.size || a.id - b.id)
}

export function suggestPartners(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
  allowed?: ReadonlySet<number>,
): PartnerSuggestion[] {
  if (setKeys.length === 0) return []
  const want = new Set(setKeys)
  // For each candidate: how many combos pair it with each set key.
  const perSetKeyCount = new Map<string, Map<string, number>>() // candidate → (setKey → count)
  for (const c of filtered(ix, sizes, allowed)) {
    const keys = groupKeysOfCombo(ix, c, level)
    const present = setKeys.filter((k) => keys.includes(k))
    if (present.length === 0) continue
    for (const cand of keys) {
      if (want.has(cand)) continue
      const m = perSetKeyCount.get(cand) ?? new Map<string, number>()
      for (const sk of present) m.set(sk, (m.get(sk) ?? 0) + 1)
      perSetKeyCount.set(cand, m)
    }
  }
  // Display order for deterministic tie-break.
  const order = new Map<string, number>()
  if (level === 0) {
    ix.data.colors.forEach((c, i) => order.set(`c${c.id}`, i))
  } else {
    const groups = level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
    groups.forEach((g, i) => order.set(g.id, i))
  }

  const out: PartnerSuggestion[] = []
  for (const [cand, m] of perSetKeyCount) {
    if (m.size !== want.size) continue // must pair with EVERY set key
    const score = [...m.values()].reduce((a, b) => a + b, 0)
    const bookVerified = combosForSet(ix, level, [...setKeys, cand], sizes, allowed).length > 0
    out.push({ key: cand, score, bookVerified })
  }
  return out.sort((a, b) =>
    Number(b.bookVerified) - Number(a.bookVerified) ||
    b.score - a.score ||
    (order.get(a.key)! - order.get(b.key)!))
}
