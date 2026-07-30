import { useEffect, useMemo, useState } from 'react'
import { measuredPalette, scorePalette } from '../../color/personalPalette'
import { colorsForSeason } from '../../core/seasonColors'
import { classifySeason, parentOf, seasonById } from '../../core/seasons'
import type { Action } from '../../core/state'
import type { ColorRecord, SkinReading } from '../../core/types'
import { dataset, warmCool, type SeasonData } from '../../data'
import { useRovingFocus } from '../useRovingFocus'
import { ShareLink } from '../ShareLink'
import { PaletteProvenance } from './PaletteProvenance'
import { YouDoorwayNote } from './YouDoorways'
import { SeasonChooser } from './SeasonChooser'
import { SeasonFit } from './SeasonFit'
import { useSeasonData } from './useSeasonData'

type Which = 'measured' | 'season'

// Wada's palette is lopsided, so a cool-toned visitor gets a structurally
// shorter list. Saying so is the difference between an honest constraint and an
// apparent bug — which is why the numbers are COMPUTED (see `warmCool` in
// src/data.ts) rather than written here. They were written here, as 109 and 48,
// and the rule that decides warm from cool gives 110 and 47.
const SHORT_LIST = 30

interface Props {
  // Null when a shared link supplied a season but no measurements — a URL never
  // carries a reading (tests/urlPrivacy.test.ts). With no reading there is no
  // measured palette and no tab strip, just the season.
  reading: SkinReading | null
  season: string | null
  dispatch: (a: Action) => void
  // Reports whichever palette is on screen, so the combinations below follow
  // the tab rather than silently ranking against the other list. The LABEL
  // travels with it because only this component knows what the season is
  // called — the season data is code-split and YouView never sees it.
  onPaletteChange?: (ids: ReadonlySet<number>, label: string) => void
  // Which colour the visitor has picked to start a palette from. Reported up so
  // the doorways can name it — they used to assume the first, which is a guess
  // about someone looking at fifty swatches.
  onSelectColor?: (id: number) => void
}

// Thin wrapper: the season datasets are code-split, so they are not here on
// first render. Splitting rather than guarding inside keeps every hook below
// unconditional.
export function PaletteTabs(props: Props) {
  const data = useSeasonData()
  if (!data) {
    return (
      <section className="you-palettes" aria-label="Your colours" aria-busy="true">
        <p className="you-note">Loading the season data…</p>
      </section>
    )
  }
  return <PaletteTabsReady {...props} data={data} />
}

function PaletteTabsReady({ reading, season, dispatch, onPaletteChange, onSelectColor, data }: Props & {
  data: SeasonData
}) {
  const { seasonColors, seasonRules, toneBands } = data
  const [which, setWhich] = useState<Which>(reading ? 'measured' : 'season')

  // Both are measurements OF the visitor, so both are empty without a reading.
  const scored = useMemo(
    () => (reading ? scorePalette(reading, dataset.data.colors) : []), [reading])
  const measured = useMemo(
    () => (reading ? measuredPalette(reading, dataset.data.colors) : []), [reading])

  const guess = useMemo(
    () => (reading ? classifySeason(seasonRules, reading, toneBands) : null),
    [reading, seasonRules, toneBands])

  // The dropdown shows our guess until the visitor overrides it. With no
  // reading the link's own season is all there is, and the first sub-season is
  // a last resort so the component can never render seasonless.
  const activeSeasonId = season ?? guess ?? seasonRules.subSeasons[0].id
  const activeSeason = seasonById(seasonRules, activeSeasonId)
  const parent = parentOf(seasonRules, activeSeasonId)

  // Membership comes from the join table, generated from the rules — no hand
  // -listed colour ids anywhere. Rows arrive best-fit first.
  const seasonRows = useMemo(
    () => colorsForSeason(seasonColors, activeSeasonId), [activeSeasonId, seasonColors])

  const seasonPalette: ColorRecord[] = useMemo(() => {
    const byId = new Map(dataset.data.colors.map((c) => [c.id, c]))
    return seasonRows.map((r) => byId.get(r.colorId)!).filter(Boolean)
  }, [seasonRows])

  const bandOf = useMemo(
    () => new Map(seasonRows.map((r) => [r.colorId, r.band])), [seasonRows])

  // With no reading there is nothing measured to show, whatever the tab says.
  const shown = reading && which === 'measured' ? measured : seasonPalette

  // `shown` is referentially stable: both branches of the ternary are useMemo
  // results. So this fires exactly when the shown list changes.
  const shownLabel = reading && which === 'measured' ? 'Your colours' : activeSeason.name

  // One tab stop for the whole grid, arrows to move within it — the pattern
  // useRovingFocus exists for. Without it a fifty-swatch grid would be fifty
  // tab stops, which is the exact defect v1.6.0 fixed in the sampler.
  const grid = useRovingFocus()
  const [picked, setPicked] = useState<number | null>(null)
  // The pick belongs to the list being shown, so switching tab or season starts
  // it over rather than leaving a selection pointing into the old palette.
  const selected = picked !== null && shown.some((c) => c.id === picked)
    ? picked
    : shown[0]?.id ?? null
  useEffect(() => {
    if (selected !== null) onSelectColor?.(selected)
  }, [selected, onSelectColor])
  useEffect(() => {
    onPaletteChange?.(new Set(shown.map((c) => c.id)), shownLabel)
  }, [shown, shownLabel, onPaletteChange])

  // Write the guessed season into state once, so the URL carries it.
  //
  // `state.you.season` used to be set ONLY when the visitor picked from the
  // dropdown. So after a capture the screen said "Deep Autumn — our guess"
  // while the state held null, and the shared link was a bare `#/you` — the
  // motivating use case for deep links ("I found my season, show a friend")
  // silently did nothing unless the visitor happened to re-select their own
  // season by hand. Found by asserting on the real clipboard contents.
  //
  // It cannot be done where the reading is set: classifySeason needs the PCCS
  // tone bands, which are code-split and not loaded yet at that point. Here
  // they are, so here is where the guess becomes real.
  //
  // Fires at most once per reading — the condition is false immediately after.
  // `guess` is still computed separately, so the dropdown's "— our guess"
  // marker keeps meaning "what we worked out" rather than "what is selected".
  useEffect(() => {
    if (season === null && guess !== null) dispatch({ type: 'setSeason', season: guess })
  }, [season, guess, dispatch])

  const reasonFor = (id: number) =>
    scored.find((s) => s.color.id === id)?.reasons.join('; ') ?? ''

  return (
    <section className="you-palettes" aria-label="Your colours">
      <SeasonChooser rules={seasonRules} activeId={activeSeasonId}
        active={activeSeason} parent={parent} guess={guess} dispatch={dispatch} />

      {/* No tab strip without a reading: there is no second palette to switch
          to, and a one-tab tablist is a lie about what is available. */}
      {reading && (
        <div className="you-tabs" role="tablist" aria-label="Which palette">
          <button role="tab" aria-selected={which === 'measured'}
            onClick={() => setWhich('measured')}>
            Measured for you · {measured.length}
          </button>
          <button role="tab" aria-selected={which === 'season'}
            onClick={() => setWhich('season')}>
            {activeSeason.name} · {seasonPalette.length}
          </button>
        </div>
      )}

      <PaletteProvenance which={which} reading={reading}
        active={activeSeason} parent={parent} />

      <div className="you-swatches" role="listbox" aria-label="Your colours — pick one to start a palette from"
        ref={grid.ref} onKeyDown={grid.onKeyDown}>
        {shown.map((c) => (
          <button key={c.id} type="button" className="you-swatch" role="option"
            aria-selected={c.id === selected} {...grid.itemProps(c.id === selected)}
            onClick={() => setPicked(c.id)}
            title={reasonFor(c.id) || c.name}>
            <i style={{ background: c.hex }} />
            <span>{c.name}</span>
            {which === 'season' && bandOf.get(c.id) && (
              <span className={`swatch-band fit-${bandOf.get(c.id)!.replace(' ', '-')}`}>
                {bandOf.get(c.id)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Directly under the grid, because "pick any swatch above" is only true
          here — the buttons it explains are in the sticky bar overhead. */}
      {shown.length > 0 && <YouDoorwayNote count={shown.length} />}

      {which === 'season' && <SeasonFit sub={activeSeason} data={data} />}

      {/* The motivating case for the whole feature: "someone finds their season
          and the only way to show a friend is to make them redo the photo".
          Only on the season view — the measured palette cannot be shared,
          because a link carries no reading. */}
      {which === 'season' && (
        <div className="you-share">
          <ShareLink label={`Copy link to ${activeSeason.name}`} />
          <span className="muted">
            The link carries the season, not your measurements.
          </span>
        </div>
      )}

      {which === 'measured' && measured.length < SHORT_LIST && (
        <p className="you-note">
          A shorter list than some people get, and that is the book rather than
          you: Wada's palette <b>leans warm</b> — {warmCool.warm} of its{' '}
          {dataset.data.colors.length} colours read warm against {warmCool.cool}{' '}
          cool — so cooler colouring has fewer to draw on here.
        </p>
      )}
    </section>
  )
}
