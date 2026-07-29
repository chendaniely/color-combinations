// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImagePicker } from '../src/components/sample/ImagePicker'

afterEach(cleanup)

describe('ImagePicker (jsdom)', () => {
  it('offers an image-only file input and rejects a non-image file', () => {
    render(<ImagePicker onSample={() => {}} onClose={() => {}} />)
    const input = screen.getByLabelText('Choose a photo') as HTMLInputElement
    expect(input.accept).toBe('image/*')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText(/isn.t an image/)).toBeTruthy()
  })

  // A fixed 3:4 stage forced object-fit: cover, which cropped the left and
  // right of a landscape photo out of reach — those regions could not be
  // eyedropped at all, and a tap's percentage position did not match the pixel
  // it sampled. jsdom cannot lay this out, so this asserts only the structural
  // half; the geometry itself is the sampleCanvas unit tests' job.
  it('shows the whole photo rather than cover-cropping it', () => {
    const { baseElement } = render(<ImagePicker onSample={() => {}} onClose={() => {}} />)
    const canvas = baseElement.querySelector('canvas')!
    expect(canvas.classList.contains('cam-canvas-contain')).toBe(true)
  })
})
