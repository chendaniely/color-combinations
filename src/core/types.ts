export const SCHEMA_VERSION = 1
import type { RGB } from './colorMath'
export type { RGB }
export type CMYK = [number, number, number, number]
export interface ColorRecord {
  id: number            // source "index", stable
  name: string
  slug: string
  hex: string           // lowercase #rrggbb
  rgb: RGB
  cmyk: CMYK
  hue: number           // precomputed, 0–360
  fineId: string        // fine-family membership (level 1)
  combinationIds: number[]
}
export interface CombinationRecord {
  id: number
  colorIds: number[]    // ascending
  size: number          // colorIds.length
  excluded: boolean     // quirks policy: true for 1-color combos
}
export interface GroupNode {
  id: string            // kebab-case
  name: string
  parentId: string | null  // fine→broad id, broad→super id, super→null
}
export interface Dataset {
  schemaVersion: number
  source: { name: string; url: string; retrievedOn: string }
  colors: ColorRecord[]
  combinations: CombinationRecord[]
  groups: { fine: GroupNode[]; broad: GroupNode[]; super: GroupNode[] }
  // group display order = array order in each list
}
export type GranularityLevel = 0 | 1 | 2 | 3   // colors/fine/broad/super
export type SizeBucket = 2 | 3 | 4             // 4 includes 5-color combos
export type AccessLensId = 'web-text' | 'print-bw' | 'colorblind'
