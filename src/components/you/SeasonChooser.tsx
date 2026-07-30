import type { Action } from '../../core/state'
import type { ParentSeason, SeasonRules, SubSeason } from '../../core/seasons'

// WHICH season, and how grounded each half of the answer is.
//
// Extracted from PaletteTabs, which had grown to eight concerns in one file and
// had been edited five times in a day — each edit needing the whole thing read
// again. CLAUDE.md: "When a file grows large, that's often a signal that it's
// doing too much."
//
// The two-level display is the point, not decoration. The parent season comes
// from a published rule (PCCS, via Korean personal-colour practice); the
// sub-season is ours, and no published source defines the twelve consistently.
// Showing them identically would be exactly the overclaiming v1.7.0 existed to
// fix, so they are badged differently and tests assert the badges LOOK
// different, not merely that they exist.
export function SeasonChooser({ rules, activeId, active, parent, guess, dispatch }: {
  rules: SeasonRules
  activeId: string
  active: SubSeason
  parent: ParentSeason
  /** What we worked out from the reading, or null when there is no reading. */
  guess: string | null
  dispatch: (a: Action) => void
}) {
  return (
    <>
      <div className="you-season-row">
        <label htmlFor="you-season">Your season</label>
        <select id="you-season" value={activeId}
          onChange={(e) => dispatch({ type: 'setSeason', season: e.target.value })}>
          {rules.subSeasons.map((s) => (
            <option key={s.id} value={s.id}>
              {/* Marks what we WORKED OUT, which is not the same as what is
                  selected — the visitor can override it, and a shared link
                  arrives with a season and no guess at all. */}
              {s.name}{s.id === guess ? ' — our guess' : ''}
            </option>
          ))}
        </select>
        <span className="you-season-hint">
          Been analysed professionally? Pick your own and the second list follows it.
        </span>
      </div>

      <div className="season-levels">
        <span className="season-parent">
          {parent.name}
          <em className="season-badge sourced">from a published system</em>
        </span>
        <span className="season-sub">
          {active.name}
          <em className="season-badge ours">our subdivision</em>
        </span>
      </div>
    </>
  )
}
