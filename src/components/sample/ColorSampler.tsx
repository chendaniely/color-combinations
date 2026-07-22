import { useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { keyColorId } from '../../core/dataset'
import type { Action, MatchLevel } from '../../core/state'
import { cameraSupported } from '../camera/cameraStream'
import { ColorCapture } from '../camera/ColorCapture'
import { ColorMatches } from './ColorMatches'
import { HexPicker } from './HexPicker'
import { ImagePicker } from './ImagePicker'

type Source = 'camera' | 'upload' | 'hex'

// Map a chosen (level, key) to a scoped Browse filter — replaces any prior filter.
function browseFor(level: MatchLevel, key: string): { family: string; shade: string; colorId: string } {
  if (level === 0) return { family: '', shade: '', colorId: String(keyColorId(key)) }
  if (level === 1) return { family: '', shade: key, colorId: '' }
  return { family: key, shade: '', colorId: '' }
}

// The unified color sampler: pick a source (camera / upload / hex), produce one
// RGB, then explore the nearest book colors and hand off to Match/Browse.
export function ColorSampler({ dispatch, onClose }: {
  dispatch: (a: Action) => void
  onClose: () => void
}) {
  const [source, setSource] = useState<Source | null>(null)
  const [rgb, setRgb] = useState<RGB | null>(null)

  if (rgb !== null) {
    return (
      <div className="cam-overlay" role="dialog" aria-label="Nearest colors">
        <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
        <ColorMatches rgb={rgb}
          onBack={() => { setRgb(null); setSource(null) }}
          onMatch={(level, key) => { dispatch({ type: 'seedPalette', key, level }); onClose() }}
          onBrowse={(level, key) => {
            dispatch({ type: 'setBrowseFilter', browse: browseFor(level, key) })
            dispatch({ type: 'setView', view: 'browse' })
            onClose()
          }} />
      </div>
    )
  }
  if (source === 'camera') return <ColorCapture onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'upload') return <ImagePicker onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'hex') return <HexPicker onSample={setRgb} onClose={() => setSource(null)} />

  return (
    <div className="cam-overlay" role="dialog" aria-label="Sample a color">
      <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
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
        <button type="button" className="sample-src" onClick={() => setSource('hex')}>
          <span className="sample-src-ic" aria-hidden="true">#</span>
          <span className="sample-src-tx"><b>Paste a hex</b><small>Like #F26522 or #236192</small></span>
        </button>
      </div>
    </div>
  )
}
