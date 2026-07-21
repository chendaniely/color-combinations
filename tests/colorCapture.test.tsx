// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorCapture } from '../src/components/camera/ColorCapture'
import type { RGB } from '../src/core/colorMath'
import { installCameraMocks } from './helpers/mockCamera'

afterEach(cleanup)

describe('ColorCapture (jsdom)', () => {
  it('freeze → tap → "Use this color" emits the sampled RGB', async () => {
    installCameraMocks([126, 135, 67])
    const onSample = vi.fn()
    render(<ColorCapture onSample={onSample} onClose={() => {}} />)
    fireEvent.click(await screen.findByLabelText('Freeze the frame'))
    fireEvent.pointerDown(document.querySelector('canvas')!, { clientX: 50, clientY: 50 })
    fireEvent.click(screen.getByText('Use this color'))
    expect(onSample).toHaveBeenCalledWith([126, 135, 67])
  })
  it('stops the camera tracks on unmount', async () => {
    const { track } = installCameraMocks()
    const { unmount } = render(<ColorCapture onSample={() => {}} onClose={() => {}} />)
    await screen.findByLabelText('Freeze the frame')
    unmount()
    expect(track.stop).toHaveBeenCalled()
  })
  it('calls onClose from the close button', () => {
    installCameraMocks()
    const onClose = vi.fn()
    render(<ColorCapture onSample={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close camera'))
    expect(onClose).toHaveBeenCalled()
  })
  it('maps a tap to the source pixel under object-fit: cover, not an independent x/y stretch', async () => {
    // Non-square source (80×40) into the mock's square 100×100 box exercises the
    // cover math specifically: a naive fill-style stretch would sample a pixel
    // the user never saw. Four x-bands — the outer two (x<20, x>=60) are cropped
    // away by cover and must never be sampled; the inner two are what's actually
    // visible, split left ([200,50,50]) vs right ([50,50,200]).
    const pixelColor = (x: number): RGB =>
      x < 20 ? [10, 10, 10] : x < 40 ? [200, 50, 50] : x < 60 ? [50, 50, 200] : [10, 10, 10]

    installCameraMocks(undefined, { width: 80, height: 40, pixelColor })
    const leftSample = vi.fn()
    const { unmount } = render(<ColorCapture onSample={leftSample} onClose={() => {}} />)
    fireEvent.click(await screen.findByLabelText('Freeze the frame'))
    fireEvent.pointerDown(document.querySelector('canvas')!, { clientX: 20, clientY: 50 })
    // The .cam-tap marker is positioned in display/box space (it's absolutely
    // positioned inside .cam-stage), NOT source-image space — so its percentage
    // must reflect the raw box-relative tap (20% into a 100px-wide box), not the
    // cover-inverted source coordinate used for averagePatch.
    expect((document.querySelector('.cam-tap') as HTMLElement).style.left).toBe('20%')
    fireEvent.click(screen.getByText('Use this color'))
    expect(leftSample).toHaveBeenCalledWith([200, 50, 50])
    unmount()

    installCameraMocks(undefined, { width: 80, height: 40, pixelColor })
    const rightSample = vi.fn()
    render(<ColorCapture onSample={rightSample} onClose={() => {}} />)
    fireEvent.click(await screen.findByLabelText('Freeze the frame'))
    fireEvent.pointerDown(document.querySelector('canvas')!, { clientX: 80, clientY: 50 })
    fireEvent.click(screen.getByText('Use this color'))
    expect(rightSample).toHaveBeenCalledWith([50, 50, 200])

    expect(leftSample.mock.calls[0][0]).not.toEqual(rightSample.mock.calls[0][0])
  })
})
