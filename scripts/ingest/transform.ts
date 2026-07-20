// Transforms the raw source format into the internal Dataset contract.
// Source-format knowledge must not leak past this directory.
import { hueOf } from '../../src/core/colorMath'
import type { CMYK, ColorRecord, CombinationRecord, Dataset, RGB } from '../../src/core/types'
import { SCHEMA_VERSION } from '../../src/core/types'
import type { Curation } from './curation'
import type { RawFile } from './rawTypes'

export function transform(raw: RawFile, curation: Curation, retrievedOn: string): Dataset {
  const colors: ColorRecord[] = raw.colors.map((c) => ({
    id: c.index,
    name: c.name,
    slug: c.slug,
    hex: c.hex.toLowerCase(),
    rgb: c.rgb_array as RGB,
    cmyk: c.cmyk_array as CMYK,
    hue: hueOf(c.hex),
    fineId: curation.assignments[c.slug],
    combinationIds: [...c.combinations],
  }))

  // Combinations are implicit in the source: combination N = every color
  // whose `combinations` array contains N.
  const members = new Map<number, number[]>()
  for (const c of raw.colors) {
    for (const comboId of c.combinations) {
      const list = members.get(comboId) ?? []
      list.push(c.index)
      members.set(comboId, list)
    }
  }
  const combinations: CombinationRecord[] = [...members.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, colorIds]) => {
      const sorted = [...colorIds].sort((a, b) => a - b)
      return { id, colorIds: sorted, size: sorted.length, excluded: sorted.length < 2 }
    })

  return {
    schemaVersion: SCHEMA_VERSION,
    source: { name: 'sanzo-wada.dmbk.io', url: 'https://sanzo-wada.dmbk.io/assets/colors.json', retrievedOn },
    colors,
    combinations,
    groups: {
      fine: curation.fineFamilies.map((f) => ({ id: f.id, name: f.name, parentId: f.broadId })),
      broad: curation.broadFamilies.map((b) => ({ id: b.id, name: b.name, parentId: b.superId })),
      super: curation.superGroups.map((s) => ({ id: s.id, name: s.name, parentId: null })),
    },
  }
}
