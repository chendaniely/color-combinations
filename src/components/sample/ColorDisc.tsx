import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { hsvToRgb, rgbToHex, type HSV } from '../../core/colorMath'
import { discPointToHueSat, hueSatToDiscPoint } from '../../core/discGeometry'

// The pin is positioned in PERCENTAGES of the disc, never pixels. Asking
// hueSatToDiscPoint for a unit radius gives offsets in [-1, 1]; since the disc
// is square (both axes read --pick-disc-size), 50% of it is exactly the radius
// in both directions. So the component carries no copy of the disc's size and
// cannot drift from the CSS — which it previously did, as RADIUS = 118 beside
// width: 236px, waiting for the first person to make the disc responsive.
const UNIT = 1

const HUE_STEP = 2
const SAT_STEP = 0.02

// Hue/saturation disc plus a brightness slider. Speaks only HSV; it knows
// nothing about hex, RGB or CMYK.
export function ColorDisc({ hsv, onChange }: {
  hsv: HSV
  onChange: (hsv: HSV) => void
}) {
  const disc = useRef<HTMLDivElement>(null)
  const { dx, dy } = hueSatToDiscPoint(hsv.h, hsv.s, UNIT)
  const hex = rgbToHex(hsvToRgb(hsv))

  function pick(e: PointerEvent<HTMLDivElement>) {
    const box = disc.current?.getBoundingClientRect()
    if (!box) return
    const { h, s } = discPointToHueSat(
      e.clientX - box.left - box.width / 2,
      e.clientY - box.top - box.height / 2,
      box.width / 2,
    )
    // atan2(0, 0) (the disc's exact center) returns an arbitrary h = 90. s is
    // 0 there regardless, so the rendered color is unaffected — but the
    // picker's whole reason for storing HSV instead of RGB is to preserve hue
    // through zero-saturation states, so a center click must not clobber it.
    onChange({ ...hsv, h: s === 0 ? hsv.h : h, s })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const mult = e.shiftKey ? 5 : 1
    if (e.key === 'ArrowLeft') onChange({ ...hsv, h: (hsv.h - HUE_STEP * mult + 360) % 360 })
    else if (e.key === 'ArrowRight') onChange({ ...hsv, h: (hsv.h + HUE_STEP * mult) % 360 })
    else if (e.key === 'ArrowUp') onChange({ ...hsv, s: Math.min(1, hsv.s + SAT_STEP * mult) })
    else if (e.key === 'ArrowDown') onChange({ ...hsv, s: Math.max(0, hsv.s - SAT_STEP * mult) })
    else return
    e.preventDefault()
  }

  return (
    <div className="pick-wrap">
      <div ref={disc} className="pick-disc" tabIndex={0} role="group"
        aria-label="Color wheel — arrow keys adjust hue and saturation"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e) }}
        onKeyDown={onKeyDown}>
        {/* brightness is exactly multiplicative on RGB, which is what V means —
            so the disc IS the color space, not a picture of it */}
        <div className="pick-face" style={{ filter: `brightness(${hsv.v})` }} />
        <div className="pick-pin" style={{
          left: `${50 + dx * 50}%`, top: `${50 + dy * 50}%`, background: hex,
        }} />
      </div>
      <label className="pick-bright">
        <span className="pick-label">Bright</span>
        <input type="range" min={0} max={100} value={Math.round(hsv.v * 100)}
          aria-label="Brightness"
          onChange={(e) => onChange({ ...hsv, v: Number(e.target.value) / 100 })} />
      </label>
    </div>
  )
}
