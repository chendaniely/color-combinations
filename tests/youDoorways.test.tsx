// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPanel } from '../src/components/AboutPanel'
import { YouDoorways } from '../src/components/you/YouDoorways'
import { measuredPalette } from '../src/color/personalPalette'
import { dataset } from '../src/data'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}
const PALETTE = new Set(measuredPalette(READING, dataset.data.colors).map((c) => c.id))

function setup(palette = PALETTE) {
  const dispatch = vi.fn()
  const utils = render(<YouDoorways palette={palette} dispatch={dispatch} />)
  return { ...utils, dispatch }
}

describe('the doorways out of the You tab', () => {
  it('offers both Match and Browse', () => {
    setup()
    expect(screen.getByRole('button', { name: /build a palette/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /browse these/i })).toBeTruthy()
  })

  it('seeds Match from a colour in the visitor\'s palette and switches view', () => {
    const { dispatch } = setup()
    fireEvent.click(screen.getByRole('button', { name: /build a palette/i }))
    const seed = dispatch.mock.calls.find((c) => c[0].type === 'seedPalette')
    expect(seed).toBeTruthy()
    expect(seed![0].level).toBe(0)
    // The key must name a colour that IS in the palette, not an arbitrary one.
    const id = Number(seed![0].key.replace(/^c/, ''))
    expect(PALETTE.has(id)).toBe(true)
  })

  it('filters Browse to a colour in the palette and switches view', () => {
    const { dispatch } = setup()
    fireEvent.click(screen.getByRole('button', { name: /browse these/i }))
    const types = dispatch.mock.calls.map((c) => c[0].type)
    expect(types).toContain('setBrowseFilter')
    expect(dispatch).toHaveBeenCalledWith({ type: 'setView', view: 'browse' })
  })

  it('says what the doorways will do, rather than leaving them bare', () => {
    const { container } = setup()
    expect(container.textContent).toMatch(/match|browse/i)
  })

  it('is hidden when there is nothing to hand over', () => {
    const { container } = render(<YouDoorways palette={new Set()} dispatch={vi.fn()} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})

// The promise made when the owner chose to ship both palettes. Not decoration:
// the season lists are our invention and the About text has to say so.
describe('the About panel states where each palette comes from', () => {
  const html = renderToString(<AboutPanel dispatch={() => {}} />)

  it('describes the You tab', () => {
    expect(html).toMatch(/photograph|photo of your face|You tab/i)
  })

  it('says the measured palette comes from the visitor\'s face', () => {
    expect(html).toMatch(/measured from your face|from your face/i)
  })

  it('says plainly that the season palettes are ours, with no published source', () => {
    expect(html).toMatch(/no published source|we wrote|our own/i)
  })

  it('does not overclaim the analysis as authoritative', () => {
    expect(html).not.toMatch(/scientifically proven|guaranteed|definitive/i)
  })

  it('repeats the on-device promise', () => {
    expect(html).toMatch(/never leaves|stays on your device|not uploaded/i)
  })
})
