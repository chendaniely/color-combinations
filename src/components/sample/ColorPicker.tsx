import { useState } from 'react'
import { hsvToRgb, rgbToHsv, type HSV, type RGB } from '../../core/colorMath'
import { ColorDisc } from './ColorDisc'
import { ColorFields } from './ColorFields'

// Opens on the owner's NYC blue so the wheel, slider and all three fields are
// populated on arrival — the control explains itself before it is touched.
const SEED: HSV = rgbToHsv([35, 97, 146])

// Pick a color by wheel or by notation. HSV is the source of truth: storing RGB
// would lose the hue at zero saturation and make the pin jump to 0° whenever the
// user drags brightness toward white or black.
export function ColorPicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const [hsv, setHsv] = useState<HSV>(SEED)
  const rgb = hsvToRgb(hsv)
  const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="cam-overlay" role="dialog" aria-label="Pick a color">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps">
        <b>Pick a color</b> — turn the wheel, or type a hex, RGB, or CMYK value.
      </p>
      <ColorDisc hsv={hsv} onChange={setHsv} />
      <ColorFields hsv={hsv} onChange={(next) => setHsv(rgbToHsv(next))} />
      <div className="cam-controls">
        <span className="pick-swatch" style={{ background: hex }} aria-hidden="true" />
        {/* Always enabled: HSV is valid by construction, so there is no invalid
            screen state. A bad draft in one field is that field's business. */}
        <button className="cam-btn primary" onClick={() => onSample(rgb)}>
          Explore this color
        </button>
      </div>
    </div>
  )
}
