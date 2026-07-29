import { useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { keyColorId } from '../../core/dataset'
import type { Action, MatchLevel } from '../../core/state'
import { cameraSupported } from '../camera/cameraStream'
import { ColorCapture } from '../camera/ColorCapture'
import { Overlay } from '../Overlay'
import { ColorMatches } from './ColorMatches'
import { ColorPicker } from './ColorPicker'
import { ImagePicker } from './ImagePicker'

type Source = 'camera' | 'upload' | 'pick'

// Map a chosen (level, key) to a scoped Browse filter — replaces any prior filter.
function browseFor(level: MatchLevel, key: string): { family: string; shade: string; colorId: string } {
  if (level === 0) return { family: '', shade: '', colorId: String(keyColorId(key)) }
  if (level === 1) return { family: '', shade: key, colorId: '' }
  return { family: key, shade: '', colorId: '' }
}

// The unified color sampler: pick a source (camera / upload / a full color
// picker), produce one RGB, then explore the nearest book colors and hand off
// to Match/Browse.
export function ColorSampler({ dispatch, onClose }: {
  dispatch: (a: Action) => void
  onClose: () => void
}) {
  const [source, setSource] = useState<Source | null>(null)
  const [rgb, setRgb] = useState<RGB | null>(null)

  if (rgb !== null) {
    return (
      <Overlay label="Nearest colors" onClose={onClose}>
        <ColorMatches rgb={rgb}
          onBack={() => { setRgb(null); setSource(null) }}
          onMatch={(level, key) => { dispatch({ type: 'seedPalette', key, level }); onClose() }}
          onBrowse={(level, key) => {
            dispatch({ type: 'setBrowseFilter', browse: browseFor(level, key) })
            dispatch({ type: 'setView', view: 'browse' })
            onClose()
          }} />
      </Overlay>
    )
  }
  if (source === 'camera') return <ColorCapture onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'upload') return <ImagePicker onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'pick') return <ColorPicker onSample={setRgb} onClose={() => setSource(null)} />

  return (
    <Overlay label="Sample a color" onClose={onClose}>
      <div className="sample-picker">
        <h2 className="sample-title">Sample a color</h2>
        <p className="sample-sub">Find the book colors nearest to one you have.</p>
        {cameraSupported() && (
          <button type="button" className="sample-src" onClick={() => setSource('camera')}>
            <span className="sample-src-ic" aria-hidden="true">📷</span>
            <span className="sample-src-tx"><b>Camera</b><small>Point at something real</small></span>
          </button>
        )}
        <button type="button" className="sample-src" onClick={() => setSource('upload')}>
          <span className="sample-src-ic" aria-hidden="true">🖼</span>
          <span className="sample-src-tx"><b>Upload a photo</b><small>Tap a color in the picture</small></span>
        </button>
        <button type="button" className="sample-src" onClick={() => setSource('pick')}>
          <span className="sample-src-ic" aria-hidden="true">🎨</span>
          <span className="sample-src-tx"><b>Pick a color</b><small>Wheel, or a hex / RGB / CMYK value</small></span>
        </button>
      </div>
    </Overlay>
  )
}
