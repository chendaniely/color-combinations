import type { SkinReading } from '../../core/types'

const CONTRAST_WORD: Record<SkinReading['contrast'], string> = {
  high: 'high contrast',
  medium: 'medium contrast',
  low: 'low contrast',
}

// What we measured, in words first and numbers second. The badge is the honest
// part: a reading taken without a white reference says so, because undertone is
// the one axis a wrong white point destroys.
export function ReadingStrip({ reading }: { reading: SkinReading }) {
  return (
    <section className="reading-strip" aria-label="What we measured">
      <div className="reading-swatches">
        <div className="reading-swatch">
          <i style={{ background: reading.skin }} />
          <div><b>Skin</b><small>{reading.skin}</small></div>
        </div>
        {reading.hair && (
          <div className="reading-swatch">
            <i style={{ background: reading.hair }} />
            <div><b>Hair</b><small>{reading.hair}</small></div>
          </div>
        )}
      </div>

      <dl className="reading-axes">
        <div>
          <dt>{reading.undertone}</dt>
          <dd>hue {reading.skinHue}° · ITA {reading.ita}°</dd>
        </div>
        <div>
          <dt>{reading.depth}</dt>
          <dd>L* {reading.skinL}</dd>
        </div>
        <div>
          <dt>{CONTRAST_WORD[reading.contrast]}</dt>
          <dd>{reading.contrastGap === null ? 'from skin alone' : `gap ${reading.contrastGap}`}</dd>
        </div>
      </dl>

      <p className={`reading-badge ${reading.whiteBalanced ? 'ok' : 'rough'}`}>
        {reading.whiteBalanced ? '✓ white-balanced' : '~ rough reading'}
      </p>

      {!reading.whiteBalanced && (
        <p className="reading-caveat">
          There was nothing white in the photo, so your camera guessed the
          lighting. Your <b>undertone</b> — warm or cool — is unverified.
          Depth and contrast are unaffected.
        </p>
      )}
      {reading.hair === null && (
        <p className="reading-caveat">
          No hair visible, so contrast comes from your skin alone and is a
          weaker reading than usual.
        </p>
      )}
    </section>
  )
}
