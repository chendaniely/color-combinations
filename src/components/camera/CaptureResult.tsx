import { useState } from 'react'
import { closenessLabel } from '../../color/colorDistance'
import { ancestorAtLevel, keyName } from '../../core/dataset'
import type { RGB } from '../../core/colorMath'
import { nearestColors } from '../../color/nearestColor'
import type { MatchLevel } from '../../core/state'
import { dataset } from '../../data'

const NEAR_COUNT = 6
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Color' }, { level: 1, label: 'Shade' }, { level: 2, label: 'Family' },
]

// key for a color id at a given match level: color → c{id}; shade/family → ancestor id
function keyAt(colorId: number, level: MatchLevel): string {
  return level === 0 ? `c${colorId}` : ancestorAtLevel(dataset, colorId, level)
}

export function CaptureResult({ rgb, onMatch, onBrowse, onRetake }: {
  rgb: RGB
  onMatch: (level: MatchLevel, key: string) => void
  onBrowse: (level: MatchLevel, key: string) => void
  onRetake?: () => void
}) {
  const near = nearestColors(dataset, rgb, NEAR_COUNT)
  const [selId, setSelId] = useState(near[0].color.id)
  const [level, setLevel] = useState<MatchLevel>(1) // default Shade
  const [showList, setShowList] = useState(false)

  const hero = dataset.colorById.get(selId)!
  const heroDist = near.find((n) => n.color.id === selId)?.distance ?? 0
  const key = keyAt(selId, level)
  const sampledHex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="cap-result">
      <div className="cap-saw">
        <span className="cap-sw" style={{ background: sampledHex }} />
        <span>Your camera saw <b>{sampledHex}</b></span>
      </div>

      <div className="cap-hero" style={{ background: hero.hex }}>
        <span className="cap-tag">Closest match · {closenessLabel(heroDist)}</span>
      </div>
      <div className="cap-name">{hero.name}</div>
      <div className="cap-code">{hero.hex}</div>

      <button className="cap-more" onClick={() => setShowList((v) => !v)}>
        {showList ? '▴ hide matches' : `▾ ${near.length - 1} more close matches`}
      </button>
      {showList && (
        <div className="cap-near">
          {near.map((n) => (
            <button key={n.color.id} className={`cap-li${n.color.id === selId ? ' sel' : ''}`}
              onClick={() => setSelId(n.color.id)}>
              <span className="cap-li-sw" style={{ background: n.color.hex }} />
              <span className="cap-li-nm">{n.color.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="cap-seg-h">Use this as — then Match or Browse</p>
      <div className="cap-seg" role="radiogroup" aria-label="Match level">
        {LEVELS.map(({ level: lv, label }) => (
          <button key={lv} role="radio" aria-checked={level === lv}
            className={`cap-opt${level === lv ? ' on' : ''}`} onClick={() => setLevel(lv)}>
            <span className="cap-opt-lv">{label}</span>
            <span className="cap-opt-val">{keyName(dataset, keyAt(selId, lv))}</span>
          </button>
        ))}
      </div>

      <div className="cap-cta">
        <button className="cam-btn primary" onClick={() => onMatch(level, key)}>Match {keyName(dataset, key)}</button>
        <button className="cam-btn ghost" onClick={() => onBrowse(level, key)}>Browse {keyName(dataset, key)}</button>
      </div>
      {onRetake && <button className="cap-retake" onClick={onRetake}>← Retake photo</button>}
    </div>
  )
}
