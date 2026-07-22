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
})
