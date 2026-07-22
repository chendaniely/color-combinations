import { useState } from 'react'
import { parseHex, type RGB } from '../../core/colorMath'

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Paste a hex color; a live swatch previews it and Explore stays disabled until
// it parses. Emits the RGB for the shared result grid.
export function HexPicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const rgb = parseHex(text)
  const showError = text.trim().length > 0 && rgb === null

  return (
    <div className="cam-overlay" role="dialog" aria-label="Enter a hex color">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps"><b>Paste a hex color</b> — like #F26522 or #236192.</p>
      <div className="hex-field">
        <span className="hex-swatch" style={{ background: rgb ? toHex(rgb) : 'transparent' }} aria-hidden="true" />
        <input className="hex-input" value={text} autoFocus placeholder="#236192"
          aria-label="Hex color" aria-invalid={showError}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && rgb) onSample(rgb) }} />
      </div>
      {showError && <p className="cam-error">Enter a 3- or 6-digit hex, e.g. #236192.</p>}
      <div className="cam-controls">
        <button className="cam-btn primary" disabled={rgb === null} onClick={() => rgb && onSample(rgb)}>
          Explore this color
        </button>
      </div>
    </div>
  )
}
