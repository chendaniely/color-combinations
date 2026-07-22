import { useState } from 'react'
import { closenessLabel } from '../../color/colorDistance'
import { nearestColors } from '../../color/nearestColor'
import type { RGB } from '../../core/colorMath'
import { ancestorAtLevel, keyName } from '../../core/dataset'
import type { MatchLevel } from '../../core/state'
import { dataset } from '../../data'

const NEAR_COUNT = 12
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Color' }, { level: 1, label: 'Shade' }, { level: 2, label: 'Family' },
]

// key for a color id at a given match level: color → c{id}; shade/family → ancestor id
function keyAt(colorId: number, level: MatchLevel): string {
  return level === 0 ? `c${colorId}` : ancestorAtLevel(dataset, colorId, level)
}
function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// The unified result: the N book colors nearest to a sampled RGB (from camera,
// upload, or hex). Pick a swatch, choose Color/Shade/Family, then Match/Browse.
export function ColorMatches({ rgb, onMatch, onBrowse, onBack }: {
  rgb: RGB
  onMatch: (level: MatchLevel, key: string) => void
  onBrowse: (level: MatchLevel, key: string) => void
  onBack?: () => void
}) {
  const near = nearestColors(dataset, rgb, NEAR_COUNT)
  const [selId, setSelId] = useState(near[0].color.id)
  const [level, setLevel] = useState<MatchLevel>(1) // default Shade
  const sel = dataset.colorById.get(selId)!
  const key = keyAt(selId, level)
  const gaveHex = toHex(rgb)

  return (
    <div className="cap-result">
      <div className="cap-saw">
        <span className="cap-sw" style={{ background: gaveHex }} />
        <span>You gave <b>{gaveHex}</b></span>
      </div>

      <p className="cap-seg-h">Nearest book colors — tap to choose</p>
      <div className="match-grid" role="listbox" aria-label="Nearest book colors">
        {near.map((n) => (
          <button key={n.color.id} type="button" role="option" aria-selected={n.color.id === selId}
            className={`match-cell${n.color.id === selId ? ' on' : ''}`}
            onClick={() => setSelId(n.color.id)}>
            <span className="match-tile" style={{ background: n.color.hex }} />
            <span className="match-nm">{n.color.name}</span>
            <span className="match-lab">{closenessLabel(n.distance)}</span>
          </button>
        ))}
      </div>

      <p className="cap-seg-h">Use {sel.name} as</p>
      <div className="cap-seg" role="radiogroup" aria-label="Match level">
        {LEVELS.map(({ level: lv, label }) => (
          <button key={lv} type="button" role="radio" aria-checked={level === lv}
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
      {onBack && <button className="cap-retake" onClick={onBack}>← Sample another color</button>}
    </div>
  )
}
