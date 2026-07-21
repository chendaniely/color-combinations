// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorCapture } from '../src/components/camera/ColorCapture'
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
})
