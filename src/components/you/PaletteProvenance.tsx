import type { ParentSeason, SubSeason } from '../../core/seasons'
import type { SkinReading } from '../../core/types'

// WHERE the palette on screen came from, and how much to trust it.
//
// Three notes that all answer that one question, extracted together from
// PaletteTabs because they are one concern rather than three:
//
// 1. The provenance line — always visible, never behind a disclosure. The
//    visitor chose to see both palettes; they must always be able to see which
//    one they are looking at and where it came from.
// 2. The shared-link note. The whole risk of a shared season is a reader
//    mistaking someone else's result for their own analysis, so the page says
//    outright that nothing on it measured THEM.
// 3. The neutral-undertone note. All four parent seasons are warm or cool, so a
//    neutral reading matches none of them and is decided by depth and contrast
//    alone. That is genuinely less certain, and the page used to state it with
//    exactly the confidence of a clear reading.
export function PaletteProvenance({ which, reading, active, parent }: {
  which: 'measured' | 'season'
  /** Null when a shared link supplied a season but no measurements. */
  reading: SkinReading | null
  active: SubSeason
  parent: ParentSeason
}) {
  return (
    <>
      {!reading && (
        <p className="you-note shared-season">
          {/* "photo below" until 2026-07-30, when the photo button moved to the
              top of the tab to stop being lost under a full page of colours.
              A stale direction is worse than none: it sends the one visitor who
              has never used this tab looking the wrong way. */}
          <b>Opened from a shared link.</b> These are {active.name}&apos;s colours
          from Wada&apos;s book — nothing here is a measurement of you. Take your own
          photo above and the site will work out your season and compare it.
        </p>
      )}

      <p className={`you-provenance ${which}`}>
        {which === 'measured'
          ? <>Measured from <b>your face</b> — your undertone, how deep your
            colouring is, and your skin-to-hair contrast, by four stated rules.
            Hover any colour to see why it is here.</>
          : <>Computed from <b>PCCS</b>, the colour system published in 1964 by the
            Japan Color Research Institute — the institute Sanzo Wada founded in
            1927, six years before this book. <b>{parent.name}</b> is a published
            rule; <b>{active.name}</b> is our own subdivision of it.</>}
      </p>

      {which === 'season' && reading?.undertone === 'neutral' && (
        <p className="you-note">
          Your undertone reads <b>neutral</b> — between warm and cool. The seasons
          are all one or the other, so this one was chosen by your depth and
          contrast alone, and a season from the other side may suit you just as
          well. Worth trying both in the dropdown above.
        </p>
      )}
    </>
  )
}
