import { useEffect, useMemo, useState } from 'react'
import { measuredPalette, scorePalette } from '../../color/personalPalette'
import { classifySeason, seasonById } from '../../core/seasons'
import type { Action } from '../../core/state'
import type { ColorRecord, SkinReading } from '../../core/types'
import { dataset, seasons } from '../../data'

type Which = 'measured' | 'season'

// Wada's palette is lopsided — 109 of its 157 colours read warm against 48
// cool — so a cool-toned visitor gets a structurally shorter list. Saying so is
// the difference between an honest constraint and an apparent bug.
const WARM_COUNT = 109
const COOL_COUNT = 48
const SHORT_LIST = 30

export function PaletteTabs({ reading, season, dispatch, onPaletteChange }: {
  reading: SkinReading
  season: string | null
  dispatch: (a: Action) => void
  // Reports whichever palette is on screen, so the combinations below follow
  // the tab rather than silently ranking against the other list.
  onPaletteChange?: (ids: ReadonlySet<number>) => void
}) {
  const [which, setWhich] = useState<Which>('measured')

  const scored = useMemo(
    () => scorePalette(reading, dataset.data.colors), [reading])
  const measured = useMemo(
    () => measuredPalette(reading, dataset.data.colors), [reading])

  // The dropdown shows our guess until the visitor overrides it.
  const activeSeasonId = season ?? classifySeason(seasons, reading)
  const activeSeason = seasonById(seasons, activeSeasonId)

  const seasonColors: ColorRecord[] = useMemo(() => {
    const ids = new Set(activeSeason.colorIds)
    return dataset.data.colors.filter((c) => ids.has(c.id))
  }, [activeSeason])

  const shown = which === 'measured' ? measured : seasonColors

  // `shown` is referentially stable: both branches of the ternary are useMemo
  // results, and `activeSeason` comes from seasonById, which returns the
  // array's own object rather than a copy. So this fires exactly when the
  // shown list changes.
  //
  // It used to list [which, measured, seasonColors] with a comment claiming
  // that depending on `shown` directly "would rebuild the Set every render and
  // loop". That was wrong — the deps were equivalent, and the stated hazard did
  // not exist. Naming the actual dependency says something true and is what the
  // linter can verify.
  useEffect(() => {
    onPaletteChange?.(new Set(shown.map((c) => c.id)))
  }, [shown, onPaletteChange])

  const reasonFor = (id: number) =>
    scored.find((s) => s.color.id === id)?.reasons.join('; ') ?? ''

  return (
    <section className="you-palettes" aria-label="Your colours">
      <div className="you-season-row">
        <label htmlFor="you-season">Your season</label>
        <select id="you-season" value={activeSeasonId}
          onChange={(e) => dispatch({ type: 'setSeason', season: e.target.value })}>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.id === classifySeason(seasons, reading) ? ' — our guess' : ''}
            </option>
          ))}
        </select>
        <span className="you-season-hint">
          Been analysed professionally? Pick your own and the second list follows it.
        </span>
      </div>

      <div className="you-tabs" role="tablist" aria-label="Which palette">
        <button role="tab" aria-selected={which === 'measured'}
          onClick={() => setWhich('measured')}>
          Measured for you · {measured.length}
        </button>
        <button role="tab" aria-selected={which === 'season'}
          onClick={() => setWhich('season')}>
          {activeSeason.name} (traditional) · {seasonColors.length}
        </button>
      </div>

      {/* Always visible, never behind a disclosure. The visitor chose to see
          both palettes; they must always be able to see where each came from. */}
      <p className={`you-provenance ${which}`}>
        {which === 'measured'
          ? <>Measured from <b>your face</b> — your undertone, how deep your
            colouring is, and your skin-to-hair contrast, by four stated rules.
            Hover any colour to see why it is here.</>
          : <>From a table <b>we wrote</b>. The twelve season palettes have no
            published source — they are our own curation, kept in an editable
            file rather than buried in code. Useful if you already know your
            season; not a measurement of you.</>}
      </p>

      <div className="you-swatches">
        {shown.map((c) => (
          <div key={c.id} className="you-swatch" title={reasonFor(c.id) || c.name}>
            <i style={{ background: c.hex }} />
            <span>{c.name}</span>
          </div>
        ))}
      </div>

      {which === 'measured' && measured.length < SHORT_LIST && (
        <p className="you-note">
          A shorter list than some people get, and that is the book rather than
          you: Wada's palette <b>leans warm</b> — {WARM_COUNT} of its 157 colours
          read warm against {COOL_COUNT} cool — so cooler colouring has fewer to
          draw on here.
        </p>
      )}
    </section>
  )
}
