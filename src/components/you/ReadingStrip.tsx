import type { SkinReading } from '../../core/types'
import { InfoTip } from './InfoTip'

const CONTRAST_WORD: Record<SkinReading['contrast'], string> = {
  high: 'high contrast',
  medium: 'medium contrast',
  low: 'low contrast',
}

// Plain-English explanations, written for someone who has never met the term.
// They sit behind an info button rather than on the page so the reading stays
// short for people who already know what it says.
const EXPLAIN = {
  undertone:
    ' is whether your skin leans golden (warm) or pink and blue (cool) — '
    + 'neutral sits between the two. It comes from the hue angle of your skin, '
    + 'and it is the one reading a wrong white balance destroys, which is why '
    + 'we ask you to hold something white in the photo.',
  depth:
    ' is simply how light or dark your colouring is overall. The number is L*, '
    + 'the lightness axis used in colour science, alongside ITA° — the same '
    + 'measure dermatologists use to describe skin.',
  contrast:
    ' is the gap in lightness between your skin and your hair. Dark hair with '
    + 'light skin is high contrast and carries strong, clear colours; when your '
    + 'skin and hair are close in lightness, strong colours tend to overpower '
    + 'you. It survives bad lighting better than undertone does, because it '
    + 'compares two things inside the same photo.',
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
          <dt>{reading.undertone} <InfoTip label="Undertone" body={EXPLAIN.undertone} /></dt>
          <dd>hue {reading.skinHue}° · ITA {reading.ita}°</dd>
        </div>
        <div>
          <dt>{reading.depth} <InfoTip label="Depth" body={EXPLAIN.depth} /></dt>
          <dd>L* {reading.skinL}</dd>
        </div>
        <div>
          <dt>
            {CONTRAST_WORD[reading.contrast]}{' '}
            <InfoTip label="Contrast" body={EXPLAIN.contrast} />
          </dt>
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
