import { useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { keyColorId } from '../../core/dataset'
import type { Action, MatchLevel } from '../../core/state'
import { CaptureResult } from './CaptureResult'
import { ColorCapture } from './ColorCapture'

// Map a chosen (level, key) to a scoped Browse filter — replaces any prior filter.
function browseFor(level: MatchLevel, key: string): { family: string; shade: string; colorId: string } {
  if (level === 0) return { family: '', shade: '', colorId: String(keyColorId(key)) }
  if (level === 1) return { family: '', shade: key, colorId: '' }
  return { family: key, shade: '', colorId: '' }
}

export function CameraSearch({ dispatch, onClose }: {
  dispatch: (a: Action) => void
  onClose: () => void
}) {
  const [rgb, setRgb] = useState<RGB | null>(null)

  if (rgb === null) {
    return <ColorCapture onSample={setRgb} onClose={onClose} />
  }
  return (
    <div className="cam-overlay" role="dialog" aria-label="Color match result">
      <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
      <CaptureResult
        rgb={rgb}
        onRetake={() => setRgb(null)}
        onMatch={(level, key) => { dispatch({ type: 'seedPalette', key, level }); onClose() }}
        onBrowse={(level, key) => {
          dispatch({ type: 'setBrowseFilter', browse: browseFor(level, key) })
          dispatch({ type: 'setView', view: 'browse' })
          onClose()
        }}
      />
    </div>
  )
}
