// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReadingStrip } from '../src/components/you/ReadingStrip'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 50.2, skinHue: 58.1, ita: 0.4, contrastGap: 40.6,
  whiteBalanced: true,
}

describe('ReadingStrip', () => {
  it('names the three axes in words', () => {
    render(<ReadingStrip reading={READING} />)
    expect(screen.getByText(/warm/i)).toBeTruthy()
    expect(screen.getByText(/^deep$/i)).toBeTruthy()
    expect(screen.getByText(/high contrast/i)).toBeTruthy()
  })

  it('badges a white-balanced reading', () => {
    render(<ReadingStrip reading={READING} />)
    expect(screen.getByText(/white-balanced/i)).toBeTruthy()
  })

  it('badges a rough reading and warns that undertone is unverified', () => {
    render(<ReadingStrip reading={{ ...READING, whiteBalanced: false }} />)
    expect(screen.getByText(/rough reading/i)).toBeTruthy()
    expect(screen.getByText(/undertone/i)).toBeTruthy()
  })

  it('says the contrast reading is weaker when no hair was visible', () => {
    render(<ReadingStrip reading={{ ...READING, hair: null, contrastGap: null }} />)
    expect(screen.getByText(/no hair visible/i)).toBeTruthy()
  })

  it('shows ITA and the measured numbers', () => {
    render(<ReadingStrip reading={READING} />)
    expect(screen.getByText(/ITA/i)).toBeTruthy()
  })
})
