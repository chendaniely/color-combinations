import { describe, expect, it } from 'vitest'
import { index } from '../src/core/dataset'
import { cssVariablesFor, jsonFor } from '../src/core/export'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const combo = ix.comboById.get(10)! // Test Pink A + Test Blue A

describe('export formatters', () => {
  it('formats CSS custom properties', () => {
    expect(cssVariablesFor(ix, combo)).toBe(
      `/* Sanzo Wada combination 10 — Test Pink A, Test Blue A */\n` +
      `:root {\n  --test-pink-a: #ffa6d9;\n  --test-blue-a: #236192;\n}\n`,
    )
  })
  it('formats JSON with names and codes', () => {
    const parsed = JSON.parse(jsonFor(ix, combo))
    expect(parsed.combination).toBe(10)
    expect(parsed.colors).toEqual([
      { name: 'Test Pink A', slug: 'test-pink-a', hex: '#ffa6d9', rgb: [255, 166, 217], cmyk: [0, 35, 15, 0] },
      { name: 'Test Blue A', slug: 'test-blue-a', hex: '#236192', rgb: [35, 97, 146], cmyk: [76, 34, 0, 43] },
    ])
  })
})
