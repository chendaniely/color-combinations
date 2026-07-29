// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InfoTip } from '../src/components/you/InfoTip'
import { ReadingStrip } from '../src/components/you/ReadingStrip'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 50.2, skinHue: 58.1, ita: 0.4, contrastGap: 40.6,
  whiteBalanced: true,
}

describe('InfoTip', () => {
  it('is closed until asked', () => {
    render(<InfoTip label="Undertone" body="Whether your skin leans golden or pink." />)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('opens on click — so it works on a phone, not just on hover', () => {
    render(<InfoTip label="Undertone" body="Whether your skin leans golden or pink." />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('tooltip').textContent).toContain('golden')
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('closes when clicked again', () => {
    render(<InfoTip label="Undertone" body="Body text." />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes on Escape', () => {
    render(<InfoTip label="Undertone" body="Body text." />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('closes when the visitor clicks elsewhere', () => {
    render(<InfoTip label="Undertone" body="Body text." />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('names what it explains, for screen readers and for hover', () => {
    render(<InfoTip label="Undertone" body="Body text." />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-label')).toMatch(/undertone/i)
    expect(btn.getAttribute('title')).toMatch(/undertone/i)
  })
})

describe('ReadingStrip info tips', () => {
  it('offers an explanation for each of the three axes', () => {
    render(<ReadingStrip reading={READING} />)
    for (const term of [/undertone/i, /depth/i, /contrast/i]) {
      expect(screen.getByRole('button', { name: term })).toBeTruthy()
    }
  })

  it('explains undertone in plain words, and says why white balance matters', () => {
    render(<ReadingStrip reading={READING} />)
    fireEvent.click(screen.getByRole('button', { name: /undertone/i }))
    const tip = screen.getByRole('tooltip').textContent!
    expect(tip).toMatch(/golden/i)
    expect(tip).toMatch(/white/i)
  })

  it('explains contrast as the gap between skin and hair', () => {
    render(<ReadingStrip reading={READING} />)
    fireEvent.click(screen.getByRole('button', { name: /contrast/i }))
    expect(screen.getByRole('tooltip').textContent).toMatch(/hair/i)
  })

  it('still shows the measured words themselves', () => {
    const { container } = render(<ReadingStrip reading={READING} />)
    const axes = within(container.querySelector('.reading-axes') as HTMLElement)
    expect(axes.getByText(/warm/i)).toBeTruthy()
    expect(axes.getByText(/high contrast/i)).toBeTruthy()
  })
})
