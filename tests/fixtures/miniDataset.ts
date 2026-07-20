import type { Dataset } from '../../src/core/types'
import { SCHEMA_VERSION } from '../../src/core/types'

// 6 colors: two pinks, one red, two blues, one gray (gray has no combos).
export const mini: Dataset = {
  schemaVersion: SCHEMA_VERSION,
  source: { name: 'test', url: 'https://example.com', retrievedOn: '2026-07-19' },
  colors: [
    { id: 1, name: 'Test Pink A', slug: 'test-pink-a', hex: '#ffa6d9', rgb: [255, 166, 217], cmyk: [0, 35, 15, 0], hue: 325.6, fineId: 'dusty-pinks', combinationIds: [10, 12, 14] },
    { id: 2, name: 'Test Pink B', slug: 'test-pink-b', hex: '#ffb3f0', rgb: [255, 179, 240], cmyk: [0, 30, 6, 0], hue: 316.6, fineId: 'dusty-pinks', combinationIds: [11, 14] },
    { id: 3, name: 'Test Red', slug: 'test-red', hex: '#ff3319', rgb: [255, 51, 25], cmyk: [0, 80, 90, 0], hue: 6.8, fineId: 'true-reds', combinationIds: [11, 13, 14] },
    { id: 4, name: 'Test Blue A', slug: 'test-blue-a', hex: '#236192', rgb: [35, 97, 146], cmyk: [76, 34, 0, 43], hue: 206.5, fineId: 'deep-blues', combinationIds: [10, 12, 14] },
    { id: 5, name: 'Test Blue B', slug: 'test-blue-b', hex: '#1b3644', rgb: [27, 54, 68], cmyk: [60, 21, 0, 73], hue: 200.5, fineId: 'deep-blues', combinationIds: [12, 13, 14] },
    { id: 6, name: 'Test Gray', slug: 'test-gray', hex: '#808080', rgb: [128, 128, 128], cmyk: [0, 0, 0, 50], hue: 0, fineId: 'grays', combinationIds: [] },
  ],
  combinations: [
    { id: 10, colorIds: [1, 4], size: 2, excluded: false },
    { id: 11, colorIds: [2, 3], size: 2, excluded: false },
    { id: 12, colorIds: [1, 4, 5], size: 3, excluded: false },
    { id: 13, colorIds: [3], size: 1, excluded: true },
    { id: 14, colorIds: [1, 2, 3, 4, 5], size: 5, excluded: false },
  ],
  groups: {
    fine: [
      { id: 'dusty-pinks', name: 'Dusty Pinks', parentId: 'pink' },
      { id: 'true-reds', name: 'True Reds', parentId: 'red' },
      { id: 'deep-blues', name: 'Deep Blues', parentId: 'blue' },
      { id: 'grays', name: 'Grays', parentId: 'blue' },
    ],
    broad: [
      { id: 'pink', name: 'Pink', parentId: 'warm' },
      { id: 'red', name: 'Red', parentId: 'warm' },
      { id: 'blue', name: 'Blue', parentId: 'cool' },
    ],
    super: [
      { id: 'warm', name: 'Warm', parentId: null },
      { id: 'cool', name: 'Cool', parentId: null },
    ],
  },
}
