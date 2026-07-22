import { describe, expect, it } from 'vitest'
import { parseHex } from '../src/core/colorMath'

describe('parseHex', () => {
  it('parses 6-digit hex with and without #', () => {
    expect(parseHex('#236192')).toEqual([35, 97, 146])
    expect(parseHex('236192')).toEqual([35, 97, 146])
  })
  it('is case-insensitive and trims whitespace', () => {
    expect(parseHex('  #23619F  ')).toEqual([35, 97, 159])
  })
  it('expands 3-digit shorthand', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('f80')).toEqual([255, 136, 0])
  })
  it('returns null for anything invalid', () => {
    for (const bad of ['', '#12', '#1234', '#12345', '#1234567', 'xyz', '#gggggg', '  ']) {
      expect(parseHex(bad)).toBeNull()
    }
  })
})
