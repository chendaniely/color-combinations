import { useState } from 'react'
import {
  cmykToRgb, hsvToRgb, parseCmyk, parseHex, parseRgb, rgbToCmyk, rgbToHex,
  type HSV, type RGB,
} from '../../core/colorMath'

type FieldName = 'hex' | 'rgb' | 'cmyk'

// The three notations of one color, all editable. A field shows its own draft
// only while it is the one being edited; every other field renders from state,
// so dragging the disc updates them live without stomping on typing.
export function ColorFields({ hsv, onChange }: {
  hsv: HSV
  onChange: (rgb: RGB) => void
}) {
  // editing, draft, and bad are deliberately single-slot (not per-field) because
  // only one text input can hold focus at a time. The editing === name guard
  // ensures every inactive field renders from props, so external changes (e.g.,
  // a colour wheel) update them live without stomping on the active field's draft.
  // If more than one field could ever be active simultaneously, these would need
  // to become per-field state.
  const [editing, setEditing] = useState<FieldName | null>(null)
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)

  const rgb = hsvToRgb(hsv)
  const shown: Record<FieldName, string> = {
    hex: rgbToHex(rgb),
    rgb: rgb.join(', '),
    cmyk: rgbToCmyk(rgb).join(', '),
  }

  function field(name: FieldName, label: string, parse: (t: string) => RGB | null) {
    const invalid = editing === name && bad
    return (
      <div className="disc-field">
        <label className="disc-label" htmlFor={`disc-${name}`}>{label}</label>
        <input id={`disc-${name}`} className="disc-input" spellCheck={false}
          value={editing === name ? draft : shown[name]}
          aria-invalid={invalid}
          onChange={(e) => {
            const text = e.target.value
            setEditing(name)
            setDraft(text)
            const next = parse(text)
            setBad(next === null)
            if (next !== null) onChange(next)
          }}
          onBlur={() => { setEditing(null); setBad(false) }} />
      </div>
    )
  }

  return (
    <div className="disc-fields">
      {field('hex', 'HEX', parseHex)}
      {field('rgb', 'RGB', parseRgb)}
      {field('cmyk', 'CMYK', (t) => {
        const v = parseCmyk(t)
        return v === null ? null : cmykToRgb(v)
      })}
    </div>
  )
}
