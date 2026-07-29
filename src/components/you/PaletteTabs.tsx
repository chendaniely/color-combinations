import { useEffect, useMemo, useState } from 'react'
import { measuredPalette, scorePalette } from '../../color/personalPalette'
import { colorsForSeason } from '../../core/seasonColors'
import { classifySeason, parentOf, seasonById } from '../../core/seasons'
import type { Action } from '../../core/state'
import type { ColorRecord, SkinReading } from '../../core/types'
import { dataset, type SeasonData } from '../../data'
import { SeasonFit } from './SeasonFit'
import { useSeasonData } from './useSeasonData'

type Which = 'measured' | 'season'

// Wada's palette is lopsided — 109 of its 157 colours read warm against 48
// cool — so a cool-toned visitor gets a structurally shorter list. Saying so is
// the difference between an honest constraint and an apparent bug.
const WARM_COUNT = 109
const COOL_COUNT = 48
const SHORT_LIST = 30

interface Props {
  reading: SkinReading
  season: string | null
  dispatch: (a: Action) => void
  // Reports whichever palette is on screen, so the combinations below follow
  // the tab rather than silently ranking against the other list.
  onPaletteChange?: (ids: ReadonlySet<number>) => void
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

function PaletteTabsReady({ reading, season, dispatch, onPaletteChange, data }: Props & {
  data: SeasonData
}) {
  const { seasonColors, seasonRules, toneBands } = data
  const [which, setWhich] = useState<Which>('measured')

  const scored = useMemo(
    () => scorePalette(reading, dataset.data.colors), [reading])
  const measured = useMemo(
    () => measuredPalette(reading, dataset.data.colors), [reading])

  const guess = useMemo(
    () => classifySeason(seasonRules, reading, toneBands), [reading, seasonRules, toneBands])

  // The dropdown shows our guess until the visitor overrides it.
  const activeSeasonId = season ?? guess
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

  const shown = which === 'measured' ? measured : seasonPalette

  // `shown` is referentially stable: both branches of the ternary are useMemo
  // results. So this fires exactly when the shown list changes.
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
          {seasonRules.subSeasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.id === guess ? ' — our guess' : ''}
            </option>
          ))}
        </select>
        <span className="you-season-hint">
          Been analysed professionally? Pick your own and the second list follows it.
        </span>
      </div>

      {/* Two levels, because they are not equally grounded. The parent comes
          from a published rule; the sub-season is ours. Presenting them the
          same way would be the overclaiming this release exists to fix. */}
      <div className="season-levels">
        <span className="season-parent">
          {parent.name}
          <em className="season-badge sourced">from a published system</em>
        </span>
        <span className="season-sub">
          {activeSeason.name}
          <em className="season-badge ours">our subdivision</em>
        </span>
      </div>

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

      {/* Always visible, never behind a disclosure. The visitor chose to see
          both palettes; they must always be able to see where each came from. */}
      <p className={`you-provenance ${which}`}>
        {which === 'measured'
          ? <>Measured from <b>your face</b> — your undertone, how deep your
            colouring is, and your skin-to-hair contrast, by four stated rules.
            Hover any colour to see why it is here.</>
          : <>Computed from <b>PCCS</b>, the colour system published in 1964 by the
            Japan Color Research Institute — the institute Sanzo Wada founded in
            1927, six years before this book. <b>{parent.name}</b> is a published
            rule; <b>{activeSeason.name}</b> is our own subdivision of it.</>}
      </p>

      <div className="you-swatches">
        {shown.map((c) => (
          <div key={c.id} className="you-swatch" title={reasonFor(c.id) || c.name}>
            <i style={{ background: c.hex }} />
            <span>{c.name}</span>
            {which === 'season' && bandOf.get(c.id) && (
              <span className={`swatch-band fit-${bandOf.get(c.id)!.replace(' ', '-')}`}>
                {bandOf.get(c.id)}
              </span>
            )}
          </div>
        ))}
      </div>

      {which === 'season' && <SeasonFit sub={activeSeason} data={data} />}

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
